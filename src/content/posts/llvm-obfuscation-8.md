---
title: "llvm代码混淆学习（八）"
published: 2023-02-24
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

> 写在前面
>
> 随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# 随机控制流原理分析

## 概述

随机控制流是虚假控制流的一种变体，随机控制流通过克隆基本块，以及添加随机跳转（随机跳转到两个功能相同的基本块中的一个）来混淆控制流。

与虚假控制流不同，随机控制流中不存在不可达基本块和不透明谓词，因此用于去除虚假控制流的手段（消除不透明谓词、符号执行获得不可达基本块后去除）失效。

随机控制流的控制流图与虚假控制流类似，都呈长条形。

## 混淆效果

随机的跳转和冗余的不可达基本块导致了大量的垃圾代码，严重干扰了攻击者的分析，并且 `rdrand` 指令可以干扰某些符号执行引擎（如 angr ）的分析。

![image-20230227155546896](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230227155546896.png)

## 原理

随机控制流同样是以基本块为单位进行混淆的，每个基本块要经过分裂、克隆、构造随机跳转和构造虚假随机跳转四个操作。

![image-20230227155725537](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230227155725537.png)

# 随机控制流代码实现思路

## 实现步骤

### 第一步：基本块拆分

将基本块拆分成头部、中部、尾部三个基本块，同虚假控制流。

![基本块拆分](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220032135705.png)

通过 `getFirstNonPHI` 函数获取第一个不是 `PHINode` 的指令，以该指令为界限进行分割，得到 `entryBB` 和 `bodyBB`。

以 `bodyBB` 的终结指令为界限进行分割，最终得到头部、中部和尾部三个基本块，也就是 `entryBB`, `bodyBB` 和 `endBB`，其中尾部只有终结指令。

```c++
// 第一步，拆分得到 entryBB,bodyBB,endBB
// 其中所有的 PHI 指令都在 entryBB(如果有的话)
// endBB 只包含一条终结指令
BasicBlock *entryBB = BB;
BasicBlock *bodyBB = entryBB->splitBasicBlock(entryBB--getFirstNonPHIOrDbgOrLifetime(), "bodyBB");
BasicBlock *endBB = bodyBB->splitBasicBlock(bodyBB->getTerminator(), "endBB");
```

### 第二步：基本块克隆

将中间的基本块进行克隆，这里可以选择对基本块进行变异，但不能改变基本块的功能。（与虚假控制流不同）

![基本块克隆](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230220032701809.png)

**能不能沿用之前的 `createCloneBasicBlock`函数？**

与虚假控制流不同，随机控制流在克隆时，还需要修复**逃逸变量**

```c++
BasicBlock *cloneBB = createCloneBasicBlock(bodyBB);
```

> 在一个基本块中定义的变量，如果在另一个基本块中被引用，那么该变量称为逃逸变量：
>
> ![image-20230227160357638](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230227160357638.png)

```c++
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
    BasicBlock *cloneBB = CloneBasicBlock(BB, VMap, "cloneBB", BB->getParent());
    // 对克隆基本块的引用进行修复
    for(Instruction &I : *cloneBB){
        for(int i = 0;i < I.getNumOperands();i ++){
            Value *V = MapValue(I.getOperand(i), VMap);
            // 如果映射出来不为空，（成功）
            if(V){
                I.setOperand(i, V);
            }
        }
    }
    return cloneBB;
}
```

### 第三步：构造随机跳转

将生成随机数的指令插入到 `entryBB`，将生成的随机数命名为`randVar`，并在`entryBB`后插入基于`randVar`的随机跳转指令。

![image-20230227160538004](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230227160538004.png)

向`entryBB`中插入随机数的指令和随机跳转，使其能够随机跳转到`bodyBB`或者`bodyBB`的克隆块。

其中随机数指令可以使用 LLVM 的内置函数`rdrand`：

> 如果使用了内置函数`rdrand`，在生成了`.ll`文件后，需要用`llc`工具静态编译生成二进制文件，此时需要添加`-mattr=rdrnd`的属性:
>
> ```
> llc -filetype=obj -mattr=+rdrnd IR/TestProgram_rcf.ll -o Bin/TestProgram_rcf.o
> ```
>
> 否则会出现 LLVM ERROR: Cannot select: t74: i64,i32,ch = X86ISD::RDRAND t0 错误。
>
> > https://blog.csdn.net/pang241/article/details/78566925

```c++
// 在 entryBB 后插入随机跳转，使其能够随机跳转到第 bodyBB 或其克隆基本块 cloneBB
entryBB->getTerminator()->eraseFromParent();
// 获取 rdrand 函数
Function *rdrand = Intrinsic::getDeclaration(entryBB->getModule(), Intrinsic::x86_rdrand_32);
// 新建 call 指令调用 rdrand 函数，返回结果是一个结构体，第一个成员是生成的随机数，第二个参数表示该函数是否调用成功
CallInst *randVarStruct = CallInst::Create(rdrand->getFunctionType(), rdrand, "", entryBB);
// 通过 rdrand 内置函数获取随机数
Value *randVar = ExtractValueInst::Create(randVarStruct, 0, "", entryBB);
insertRandomBranch(randVar, bodyBB, cloneBB, entryBB);
```

`Intrinsic::getDeclaration(id)`方法：获取并且创建一个 LLVM 内置函数，这个 id 可以在 `intrinsics.gen` 中找到。这里调用 LLVM 内置的 `rdrand` 生成随机数的函数。

`insertRandomBranch`函数：

```c++
void RandomControlFlow::insertRandomBranch(Value *randVar, BasicBlock *ifTrue, BasicBlock *ifFalse, BasicBlock *insertAfter){
    // 对随机数进行等价变换
    Value *alteredRandVar = alterVal(randVar, insertAfter);
    // and 1 == % 2
    Value *randMod2 = BinaryOperator::Create(Instruction::And, alteredRandVar, CONST_I32(1), "", insertAfter);
    ICmpInst *condition = new ICmpInst(*insertAfter, ICmpInst::ICMP_EQ, randMod2, CONST_I32(1));
    // 跳转到不同基本块
    BranchInst::Create(ifTrue, ifFalse, condition, insertAfter);
}
```

对随机变量的恒等变换：

```c++
Value* RandomControlFlow::alterVal(Value *startVar,BasicBlock *insertAfter){
    uint32_t code = rand() % 3;
    Value *result;
    if(code == 0){
        // x = x * (x + 1) - x^2
        BinaryOperator *op1 = BinaryOperator::Create(Instruction::Add, startVar, CONST_I32(1), "", insertAfter);
        BinaryOperator *op2 = BinaryOperator::Create(Instruction::Mul, startVar, op1, "", insertAfter);
        BinaryOperator *op3 = BinaryOperator::Create(Instruction::Mul, startVar, startVar, "", insertAfter);
        BinaryOperator *op4 = BinaryOperator::Create(Instruction::Sub, op2, op3, "", insertAfter);
        result = op4;
    }else if(code == 1){
        // x = 3 * x * (x - 2) - 3 * x^2 + 7 * x
        BinaryOperator *op1 = BinaryOperator::Create(Instruction::Mul, startVar, CONST_I32(3), "", insertAfter);
        BinaryOperator *op2 = BinaryOperator::Create(Instruction::Sub, startVar, CONST_I32(2), "", insertAfter);
        BinaryOperator *op3 = BinaryOperator::Create(Instruction::Mul, op1, op2, "", insertAfter);
        BinaryOperator *op4 = BinaryOperator::Create(Instruction::Mul, startVar, startVar, "", insertAfter);
        BinaryOperator *op5 = BinaryOperator::Create(Instruction::Mul, op4, CONST_I32(3), "", insertAfter);
        BinaryOperator *op6 = BinaryOperator::Create(Instruction::Mul, startVar, CONST_I32(7), "", insertAfter);
        BinaryOperator *op7 = BinaryOperator::Create(Instruction::Sub, op3, op5, "", insertAfter);
        BinaryOperator *op8 = BinaryOperator::Create(Instruction::Add, op6, op7, "", insertAfter);
        result = op8;
    }else if(code == 2){
        // x = (x - 1) * (x + 3) - (x + 4) * (x - 3) - 9
        BinaryOperator *op1 = BinaryOperator::Create(Instruction::Sub, startVar, CONST_I32(1), "", insertAfter);
        BinaryOperator *op2 = BinaryOperator::Create(Instruction::Add, startVar, CONST_I32(3), "", insertAfter);
        BinaryOperator *op3 = BinaryOperator::Create(Instruction::Add, startVar, CONST_I32(4), "", insertAfter);
        BinaryOperator *op4 = BinaryOperator::Create(Instruction::Sub, startVar, CONST_I32(3), "", insertAfter);
        BinaryOperator *op5 = BinaryOperator::Create(Instruction::Mul, op1, op2, "", insertAfter);
        BinaryOperator *op6 = BinaryOperator::Create(Instruction::Mul, op3, op4, "", insertAfter);
        BinaryOperator *op7 = BinaryOperator::Create(Instruction::Sub, op5, op6, "", insertAfter);
        BinaryOperator *op8 = BinaryOperator::Create(Instruction::Sub, op7, CONST_I32(9), "", insertAfter);
        result = op8;
    }
    return result;
}
```

### 第四步：构造虚假随机跳转

在`bodyBB`和`cloneBB`后插入虚假随机跳转指令（实际上仍然会直接跳转到`endBB`）：

![image-20230227161159175](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230227161159175.png)

```c++
// 添加 bodyBB 到 bodyBB.clone 的虚假随机跳转
bodyBB->getTerminator()->eraseFromParent();
insertRandomBranch(randVar, endBB, cloneBB, bodyBB);
// 添加 bodyBB.clone 到 bodyBB 的虚假随机跳转
cloneBB->getTerminator()->eraseFromParent();
insertRandomBranch(randVar, bodyBB, endBB, cloneBB);
```

# 随机控制流代码实现

## RandomControlFlow.cpp

```c++
#include "llvm/IR/Function.h"
#include "llvm/Pass.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils/Local.h"
#include "llvm/IR/Intrinsics.h"
#include "llvm/IR/IntrinsicsX86.h"
#include "SplitBasicBlock.h"
#include "Utils.h"
#include <vector>
#include <cstdlib>
#include <ctime>
using std::vector;
using namespace llvm;

// 混淆次数，混淆次数越多混淆结果越复杂
static cl::opt<int> obfuTimes("rcf_loop", cl::init(1), cl::desc("Obfuscate a function <bcf_loop> time(s)."));

namespace{
    struct RandomControlFlow : public FunctionPass{
        static char ID;

        RandomControlFlow() : FunctionPass(ID){
            srand(time(NULL));
        }

        bool runOnFunction(Function &F);

        // 创建一组等效于 origVar 的指令
        Value* alterVal(Value *origVar,BasicBlock *insertAfter);

        void insertRandomBranch(Value *randVar, BasicBlock *ifTrue, BasicBlock *ifFalse, BasicBlock *insertAfter);

        // 以基本块为单位进行随机控制流混淆
        bool randcf(BasicBlock *BB);

    };
}


bool RandomControlFlow::runOnFunction(Function &F){
    INIT_CONTEXT(F);
    FunctionPass *pass = createSplitBasicBlockPass();
    pass->runOnFunction(F);
    for(int i = 0;i < obfuTimes;i ++){
        vector<BasicBlock*> origBB;
        for(BasicBlock &BB : F){
            origBB.push_back(&BB);
        }
        for(BasicBlock *BB : origBB){
            randcf(BB);
        }
    }
    return true;
}

void RandomControlFlow::insertRandomBranch(Value *randVar, BasicBlock *ifTrue, BasicBlock *ifFalse, BasicBlock *insertAfter){
    // 对随机数进行等价变换
    Value *alteredRandVar = alterVal(randVar, insertAfter);
    // and 1 == % 2
    // Value *randMod2 = BinaryOperator::CreateURem(alteredRandVar, CONST_I32(2), "", insertAfter);
    Value *randMod2 = BinaryOperator::Create(Instruction::And, alteredRandVar, CONST_I32(1), "", insertAfter);
    ICmpInst *condition = new ICmpInst(*insertAfter, ICmpInst::ICMP_EQ, randMod2, CONST_I32(1));
    // 跳转到不同基本块
    BranchInst::Create(ifTrue, ifFalse, condition, insertAfter);
}

bool RandomControlFlow::randcf(BasicBlock *BB){
    // 拆分得到 entryBB, bodyBB, endBB
    // 其中所有的 PHI 指令都在 entryBB(如果有的话)
    // endBB 只包含一条终结指令
    BasicBlock *entryBB = BB;
    BasicBlock *bodyBB = entryBB->splitBasicBlock(BB->getFirstNonPHIOrDbgOrLifetime(), "bodyBB");
    BasicBlock *endBB = bodyBB->splitBasicBlock(bodyBB->getTerminator(), "endBB");
    BasicBlock *cloneBB = createCloneBasicBlock(bodyBB);

    // 在 entryBB 后插入随机跳转，使其能够随机跳转到第 bodyBB 或其克隆基本块 cloneBB
    entryBB->getTerminator()->eraseFromParent();
    // 获取 rdrand 函数
    Function *rdrand = Intrinsic::getDeclaration(entryBB->getModule(), Intrinsic::x86_rdrand_32);
    // 新建 call 指令调用 rdrand 函数，返回结果是一个结构体，第一个成员是生成的随机数，第二个参数表示该函数是否调用成功
    CallInst *randVarStruct = CallInst::Create(rdrand->getFunctionType(), rdrand, "", entryBB);
    // 通过 rdrand 内置函数获取随机数
    Value *randVar = ExtractValueInst::Create(randVarStruct, 0, "", entryBB);
    insertRandomBranch(randVar, bodyBB, cloneBB, entryBB);

    // 添加 bodyBB 到 bodyBB.clone 的虚假随机跳转
    bodyBB->getTerminator()->eraseFromParent();
    insertRandomBranch(randVar, endBB, cloneBB, bodyBB);
    // 添加 bodyBB.clone 到 bodyBB 的虚假随机跳转
    cloneBB->getTerminator()->eraseFromParent();
    insertRandomBranch(randVar, bodyBB, endBB, cloneBB);

    return true;
}

Value* RandomControlFlow::alterVal(Value *startVar,BasicBlock *insertAfter){
    uint32_t code = rand() % 3;
    Value *result;
    if(code == 0){
        // x = x * (x + 1) - x^2
        BinaryOperator *op1 = BinaryOperator::Create(Instruction::Add, startVar, CONST_I32(1), "", insertAfter);
        BinaryOperator *op2 = BinaryOperator::Create(Instruction::Mul, startVar, op1, "", insertAfter);
        BinaryOperator *op3 = BinaryOperator::Create(Instruction::Mul, startVar, startVar, "", insertAfter);
        BinaryOperator *op4 = BinaryOperator::Create(Instruction::Sub, op2, op3, "", insertAfter);
        result = op4;
    }else if(code == 1){
        // x = 3 * x * (x - 2) - 3 * x^2 + 7 * x
        BinaryOperator *op1 = BinaryOperator::Create(Instruction::Mul, startVar, CONST_I32(3), "", insertAfter);
        BinaryOperator *op2 = BinaryOperator::Create(Instruction::Sub, startVar, CONST_I32(2), "", insertAfter);
        BinaryOperator *op3 = BinaryOperator::Create(Instruction::Mul, op1, op2, "", insertAfter);
        BinaryOperator *op4 = BinaryOperator::Create(Instruction::Mul, startVar, startVar, "", insertAfter);
        BinaryOperator *op5 = BinaryOperator::Create(Instruction::Mul, op4, CONST_I32(3), "", insertAfter);
        BinaryOperator *op6 = BinaryOperator::Create(Instruction::Mul, startVar, CONST_I32(7), "", insertAfter);
        BinaryOperator *op7 = BinaryOperator::Create(Instruction::Sub, op3, op5, "", insertAfter);
        BinaryOperator *op8 = BinaryOperator::Create(Instruction::Add, op6, op7, "", insertAfter);
        result = op8;
    }else if(code == 2){
        // x = (x - 1) * (x + 3) - (x + 4) * (x - 3) - 9
        BinaryOperator *op1 = BinaryOperator::Create(Instruction::Sub, startVar, CONST_I32(1), "", insertAfter);
        BinaryOperator *op2 = BinaryOperator::Create(Instruction::Add, startVar, CONST_I32(3), "", insertAfter);
        BinaryOperator *op3 = BinaryOperator::Create(Instruction::Add, startVar, CONST_I32(4), "", insertAfter);
        BinaryOperator *op4 = BinaryOperator::Create(Instruction::Sub, startVar, CONST_I32(3), "", insertAfter);
        BinaryOperator *op5 = BinaryOperator::Create(Instruction::Mul, op1, op2, "", insertAfter);
        BinaryOperator *op6 = BinaryOperator::Create(Instruction::Mul, op3, op4, "", insertAfter);
        BinaryOperator *op7 = BinaryOperator::Create(Instruction::Sub, op5, op6, "", insertAfter);
        BinaryOperator *op8 = BinaryOperator::Create(Instruction::Sub, op7, CONST_I32(9), "", insertAfter);
        result = op8;
    }
    return result;
}

char RandomControlFlow::ID = 0;
static RegisterPass<RandomControlFlow> X("rcf", "Add random control flow to each function.");
```

## Utils.cpp

```c++
#include "../include/Utils.h"
#include <vector>
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils/Local.h"
#include "llvm/Transforms/Utils/ValueMapper.h"
#include "llvm/Transforms/Utils/Cloning.h"

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
    BasicBlock *cloneBB = CloneBasicBlock(BB, VMap, "cloneBB", BB->getParent());
    // 对克隆基本块的引用进行修复
    for(Instruction &I : *cloneBB){
        for(int i = 0;i < I.getNumOperands();i ++){
            Value *V = MapValue(I.getOperand(i), VMap);
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
#ifndef _UTILS_H_
#define _UTILS_H_

#include "llvm/IR/Function.h"
// 获取当前函数 context
#define INIT_CONTEXT(F) CONTEXT=&F.getContext()
#define TYPE_I32 Type::getInt32Ty(*CONTEXT)
// 创建常量
#define CONST_I32(V) ConstantInt::get(TYPE_I32, V, false)
#define CONST(T, V) ConstantInt::get(T, V)

extern llvm::LLVMContext *CONTEXT;

// 对 PHI 指令和逃逸变量进行修复函数，添加到命名空间 llvm 里
namespace llvm{
    void fixStack(Function &F);
    BasicBlock* createCloneBasicBlock(BasicBlock *BB);
}

#endif
```
