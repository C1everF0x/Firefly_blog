---
title: "llvm代码混淆学习（六）"
published: 2023-02-20
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

> 写在前面
>
> 随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# 虚假控制流原理分析

## 概述

虚假控制流指，通过向正常控制流中插入若干**不可达基本块**（永远不会被执行的基本块）和由**不透明谓词**（指一个表达式，它的值在执行到某处时，对程序员而言必然是已知的，但是由于某种原因，编译器或者说静态分析器无法推断出这个值，只能在运行时确定）造成的虚假跳转，以产生大量垃圾代码干扰攻击者分析的混淆。

![image-20230220031652121](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220031652121.png)

真实的情况更加复杂。虚假的跳转和冗余的不可达基本块导致了大量垃圾代码，严重干扰了攻击者的分析：

![image-20230220031603287](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220031603287.png)



## 结构 && 混淆效果

与控制流平坦化不同，经过虚假控制流混淆的控制流图呈长条状。

![image-20230220031736708](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220031736708.png)

## 原理

虚假控制流是以基本块为单位进行混淆的，每个基本块要经过分裂、克隆、构建虚假跳转等操作。

![image-20230220031908904](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220031908904.png)

# 虚假控制流代码实现思路

## 实现步骤

### 第一步：基本块拆分

将基本块拆分成**头部、中部和尾部**三个基本块。

![image-20230220032135705](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220032135705.png)

通过 `getFirstNonPHI` 函数获取第一个不是 `PHINode` 的指令，以该指令为界限进行分割，得到 `entryBB` 和 `bodyBB`。

> 因为绝大多数基本块中 PHI 指令都在最前面

以 `bodyBB` 的终结指令为界限进行分割，最终得到头部、中部和尾部三个基本块，也就是 `entryBB`, `bodyBB` 和 `endBB`，其中尾部只有终结指令。

```c++
void BogusControlFlow::bogus(BasicBlock *entryBB){
    // 第一步，拆分得到 entryBB,bodyBB,endBB
    // 其中所有的 PHI 指令都在 entryBB(如果有的话)
    // endBB 只包含一条终结指令
    BasicBlock *bodyBB = entryBB->splitBasicBlock(entryBB--getFirstNonPHI(), "bodyBB");
    BasicBlock *endBB = bodyBB->splitBasicBlock(bodyBB->getTerminator(), "endBB");
```

`getFirstNonPHI`函数：获取第一条不是 PHI 指令的指令。

### 第二步：基本块克隆

克隆中间的 `bodyBB`，得到克隆块 `cloneBB`。

![image-20230220032701809](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220032701809.png)

LLVM 自带 `CloneBasicBlock` 函数，但该函数为不完全克隆，还需要做一些补充处理。

把基本块的克隆操作写到 `createCloneBasicBlock` 函数中：

```c++
//第二步，克隆bodyBB 得到克隆块cloneBB
BasicBlock *cloneBB = createCloneBasicBlock(bodyBB);
```

`CloneBasicBlock`函数的问题：

在克隆的基本块中，仍然引用了原基本块中的 `%a` 变量，该引用是非法的，故需要将 `%a` 映射为 `%a.clone`：

```assembly
orig:
  %a = ...
  %b = fadd %a, ...
  
clone:
  %a.clone = ...
  %b.clone = fadd %a, ... ; Note that this references the old %a and not %a.clone!
```

根据 VMap 对克隆基本块中的变量进行修复：

```c++
BasicBlock* llvm::createCloneBasicBlock(BasicBlock *BB){
    // 创建一个映射表类型变量
    ValueToValueMapTy VMap;
    BasicBlock *cloneBB = cloneBasicBlock(BB, VMap, BB->getName() + "cloneBB", BB->getParent());
    // 对克隆基本块的引用进行修复
    for(Instruction &I : *cloneBB){
        for(int i = 0;i < I.getNumOperands();i ++){
            value *V = MapValue(I.getOperand(i), VMap);
            // 如果映射出来不为空，（成功）
            if(V){
                I.setOperand(i, V);
            }
        }
    }
    return cloneBB;
}
```

`cloneBasicBlock`函数：自带的克隆基本块函数，第一个参数为要克隆的基本块，第二个参数是映射表，第三个参数为克隆后基本块的名称，第四个为克隆基本块所属函数。

`getParent`方法：返回基本块所属函数。

`getNumOperands`方法：获取给定下标的指令的操作数的数量。

`MapValue`函数：映射变量。

`getOperand`方法：获取操作数。

`setOperand`方法：替换操作数。

### 第三步：基本块变异 && 构造虚假跳转

将 `entryBB` 到 `bodyBB` 的绝对跳转改为条件跳转

将 `bodyBB` 到 `endBB` 的绝对跳转改为条件跳转

添加 `cloneBB` 到 `bodyBB` 的绝对跳转

![image-20230220033827771](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220033827771.png)

```c++
// 第三步，构造虚假跳转
// 1. 将 entryBB, bodyBB, cloneBB 末尾的绝对跳转移除
entryBB->getTerminator()->eraseFromParent();
bodyBB->getTerminator()->eraseFromParent();
cloneBB->getTerminator()->eraseFromParent();
// 2. 在 entryBB 和 bodyBB 的末尾插入条件 恒为真 的虚假比较指令
Value *cond1 = createBogusCmp(entryBB); 
Value *cond2 = createBogusCmp(bodyBB); 
// 3. 将 entryBB 到 bodyBB 的绝对跳转改为条件跳转，条件为 cond1，为真跳转 bodyBB，为假跳转 cloneBB
BranchInst::Create(bodyBB, cloneBB, cond1, entryBB);
// 4. 将 bodyBB 到 endBB的绝对跳转改为条件跳转，条件为 cond2，为真跳转 endBB，为假跳转 cloneBB
BranchInst::Create(endBB, cloneBB, cond2, bodyBB);
// 5. 添加 bodyBB.clone 到 bodyBB 的绝对跳转
BranchInst::Create(bodyBB, cloneBB);
```

该比较指令等价于 `if(y < 10 || x * (x + 1) % 2 == 0)`：

```c++
Value* BogusControlFlow::createBogusCmp(BasicBlock *insertAfter){
    // if((y < 10 || x * (x + 1) % 2 == 0))
    // 等价于 if(true)
    Module *M = insertAfter->getModule();
    // 创建两个全局变量 x、y
    GlobalVariable *xptr = new GlobalVariable(*M, TYPE_I32, false, GlobalValue::CommonLinkage, CONST_I32(0), "x");
    GlobalVariable *yptr = new GlobalVariable(*M, TYPE_I32, false, GlobalValue::CommonLinkage, CONST_I32(0), "y");
    // 加载两个全局变量
    LoadInst *x = new LoadInst(TYPE_I32, xptr, "", insertAfter);
    LoadInst *y = new LoadInst(TYPE_I32, yptr, "", insertAfter);
    // 创建 y < 10 和 x * (x + 1) % 2 两个式子
    // 创建 y < 10
    ICmpInst *cond1 = new ICmpInst(*insertAfter, CmpInst::ICMP_SLT, y, CONST_I32(10));
    // 创建 x * (x + 1) % 2
    BinaryOperator *op1 = BinaryOperator::CreateAdd(x, CONST_I32(1), "", insertAfter);
    BinaryOperator *op2 = BinaryOperator::CreateMul(op1, x, "", insertAfter);
    BinaryOperator *op3 = BinaryOperator::CreateURem(op2, CONST_I32(2), "", insertAfter);
    ICmpInst *cond2 = new ICmpInst(*insertAfter, CmpInst::ICMP_EQ, op3, CONST_I32(0));
    return BinaryOperator::CreateOr(cond1, cond2, "", insertAfter);
}
```

`GlobalVariable`：全局变量类型，其析构函数可以用于创建一个全局变量，第一个参数是模块，第二个参数是全局变量类型，第三个参数选择是否为常量，第四个参数选择链接方式（CommonLinkage），第五个参数是初始值（为0），第六个参数为创建出来的参数名字。

`LoadInst`：读取指令，其析构函数可以创建一条读取指令，第一个参数是全局变量类型，第二个参数是全局变量指针，第三个参数是名称，第四个参数指定插入到哪个基本块（insertAfter。

`ICmpInst`：比较指令，其析构函数可以创建一条比较指令，第一个参数是指定插入到哪个基本块后面，第二个参数是谓词，指定为大于、小于、或等于（CmpInst::ICMP_SLT），第三个参数和第四个参数分别指定左边和右边的参数。

`BinaryOperator`：二元运算指令，可以创建加减乘除和与或非等指令。

# 虚假控制流代码实现

## BogusControlFlow.cpp

```c++
#include "llvm/IR/Function.h"
#include "llvm/Pass.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Transforms/Utils/ValueMapper.h"
#include "llvm/Transforms/Utils/Cloning.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Instructions.h"
#include "SplitBasicBlock.h"
#include "Utils.h"
#include <vector>
#include <cstdlib>
#include <ctime>
using std::vector;
using namespace llvm;

// 混淆次数，混淆次数越多混淆结果越复杂
static cl::opt<int> obfuTimes("bcf_loop", cl::init(1), cl::desc("Obfuscate a function <bcf_loop> time(s)."));

namespace{
    class BogusControlFlow : public FunctionPass {
        public:
            static char ID;
            BogusControlFlow() : FunctionPass(ID) {
                srand(time(NULL));
            }

            bool runOnFunction(Function &F);

            // 对基本块 BB 进行混淆
            void bogus(BasicBlock *BB);

            // 创建条件恒为真的 ICmpInst*
            // 该比较指令的条件为：y < 10 || x * (x + 1) % 2 == 0
            // 其中 x, y 为恒为0的全局变量
            Value* createBogusCmp(BasicBlock *insertAfter);
    };

}

bool BogusControlFlow::runOnFunction(Function &F){
    INIT_CONTEXT(F);
    FunctionPass *pass = createSplitBasicBlockPass();
    pass->runOnFunction(F);
    for(int i = 0;i < obfuTimes;i ++){
        vector<BasicBlock*> origBB;
        for(BasicBlock &BB : F){
            origBB.push_back(&BB);
        }
        for(BasicBlock *BB : origBB){
            bogus(BB);
        }
    }
    return true;
}

Value* BogusControlFlow::createBogusCmp(BasicBlock *insertAfter){
    // if((y < 10 || x * (x + 1) % 2 == 0))
    // 等价于 if(true)
    Module *M = insertAfter->getModule();
    // 创建两个全局变量 x、y
    GlobalVariable *xptr = new GlobalVariable(*M, TYPE_I32, false, GlobalValue::CommonLinkage, CONST_I32(0), "x");
    GlobalVariable *yptr = new GlobalVariable(*M, TYPE_I32, false, GlobalValue::CommonLinkage, CONST_I32(0), "y");
    // 加载两个全局变量
    LoadInst *x = new LoadInst(TYPE_I32, xptr, "", insertAfter);
    LoadInst *y = new LoadInst(TYPE_I32, yptr, "", insertAfter);
    // 创建 y < 10 和 x * (x + 1) % 2 两个式子
    // 创建 y < 10
    ICmpInst *cond1 = new ICmpInst(*insertAfter, CmpInst::ICMP_SLT, y, CONST_I32(10));
    // 创建 x * (x + 1) % 2
    BinaryOperator *op1 = BinaryOperator::CreateAdd(x, CONST_I32(1), "", insertAfter);
    BinaryOperator *op2 = BinaryOperator::CreateMul(op1, x, "", insertAfter);
    BinaryOperator *op3 = BinaryOperator::CreateURem(op2, CONST_I32(2), "", insertAfter);
    ICmpInst *cond2 = new ICmpInst(*insertAfter, CmpInst::ICMP_EQ, op3, CONST_I32(0));
    return BinaryOperator::CreateOr(cond1, cond2, "", insertAfter);
}

void BogusControlFlow::bogus(BasicBlock *entryBB){
    // 第一步，拆分得到 entryBB,bodyBB,endBB
    // 其中所有的 PHI 指令都在 entryBB(如果有的话)
    // endBB 只包含一条终结指令
    BasicBlock *bodyBB = entryBB->splitBasicBlock(entryBB--getFirstNonPHI(), "bodyBB");
    BasicBlock *endBB = bodyBB->splitBasicBlock(bodyBB->getTerminator(), "endBB");
    
    // 第二步，克隆 bodyBB 得到克隆块 cloneBB
    BasicBlock *cloneBB = createCloneBasicBlock(bodyBB);

    // 第三步，构造虚假跳转
    // 1. 将 entryBB, bodyBB, cloneBB 末尾的绝对跳转移除
    entryBB->getTerminator()->eraseFromParent();
    bodyBB->getTerminator()->eraseFromParent();
    cloneBB->getTerminator()->eraseFromParent();
    // 2. 在 entryBB 和 bodyBB 的末尾插入条件 恒为真 的虚假比较指令
    Value *cond1 = createBogusCmp(entryBB); 
    Value *cond2 = createBogusCmp(bodyBB); 
    // 3. 将 entryBB 到 bodyBB 的绝对跳转改为条件跳转，条件为 cond1，为真跳转 bodyBB，为假跳转 cloneBB
    BranchInst::Create(bodyBB, cloneBB, cond1, entryBB);
    // 4. 将 bodyBB 到 endBB的绝对跳转改为条件跳转，条件为 cond2，为真跳转 endBB，为假跳转 cloneBB
    BranchInst::Create(endBB, cloneBB, cond2, bodyBB);
    // 5. 添加 bodyBB.clone 到 bodyBB 的绝对跳转
    BranchInst::Create(bodyBB, cloneBB);
}

char BogusControlFlow::ID = 0;
static RegisterPass<BogusControlFlow> X("bcf", "Add bogus control flow to each function.");
```

## Utils.cpp

```c++
#include <vector>
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils/Local.h"
#include "llvm/Transforms/Utils/ValueMapper.h"
#include "llvm/Transforms/Utils/Cloning.h"
#include "Utils.h"
using std::vector;
using namespace llvm;

LLVMContext *CONTEXT = nullptr;

void llvm::fixStack(Function &F) {
    vector<PHINode*> origPHI;
    vector<Instruction*> origReg;
    BasicBlock &entryBB = F.getEntryBlock();
    for(BasicBlock &BB : F){
        for(Instruction &I : BB){
            if(PHINode *PN = dyn_cast<PHINode>(&I)){
                origPHI.push_back(PN);
            }else if(!(isa<AllocaInst>(&I) && I.getParent() == &entryBB) 
                && I.isUsedOutsideOfBlock(&BB)){
                origReg.push_back(&I);
            }
        }
    }
    for(PHINode *PN : origPHI){
        DemotePHIToStack(PN, entryBB.getTerminator());
    }
    for(Instruction *I : origReg){
        DemoteRegToStack(*I, entryBB.getTerminator());
    }
}

BasicBlock* llvm::createCloneBasicBlock(BasicBlock *BB){
    // 克隆之前先修复所有逃逸变量
    vector<Instruction*> origReg;
    BasicBlock &entryBB = BB->getParent()->getEntryBlock();
    for(Instruction &I : *BB){
        if(!(isa<AllocaInst>(&I) && I.getParent() == &entryBB) 
            && I.isUsedOutsideOfBlock(BB)){
            origReg.push_back(&I);
        }
    }
    for(Instruction *I : origReg){
        DemoteRegToStack(*I, entryBB.getTerminator());
    }
    // 创建一个映射表类型变量
    ValueToValueMapTy VMap;
    BasicBlock *cloneBB = cloneBasicBlock(BB, VMap, BB->getName() + "cloneBB", BB->getParent());
    // 对克隆基本块的引用进行修复
    for(Instruction &I : *cloneBB){
        for(int i = 0;i < I.getNumOperands();i ++){
            value *V = MapValue(I.getOperand(i), VMap);
            // 如果映射出来不为空，（成功）
            if(V){
                I.setOperand(i, V);
            }
        }
    }
    return cloneBB;
}
```

## Utils.h

```c++
#ifndef __UTILS_H__
#define __UTILS_H__

#include "llvm/IR/Function.h"
#define INIT_CONTEXT(F) CONTEXT=&F.getContext()
#define TYPE_I32 Type::getInt32Ty(*CONTEXT)
#define CONST_I32(V) ConstantInt::get(TYPE_I32, V, false)
#define CONST(T, V) ConstantInt::get(T, V)

extern llvm::LLVMContext *CONTEXT;

namespace llvm{
    void fixStack(Function &F);
    BasicBlock* createCloneBasicBlock(BasicBlock *BB);
}

#endif
```
