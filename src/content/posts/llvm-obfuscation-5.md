---
title: "llvm代码混淆学习（五）"
published: 2023-02-15
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

> 写在前面
>
> 随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# 控制流平坦化原理分析

## 概述

控制流平坦化指的是将正常控制流中基本块之间的跳转关系删除，用一个集中的分发块来调度基本块的执行顺序。

![image-20230215152327999](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215152327999.png)

## 结构

+ **入口块**：进入函数第一个执行的基本块。
+ **主分发块与子分发块**：负责跳转到下一个要执行的原基本块。
+ **原基本块**：混淆之前的基本块，真正完成程序工作的基本块。
+ **返回块**：返回到主分发块。

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215152513926.png)

所有完成原程序功能的原基本块平行排列在返回块上方，ida反汇编出来看起来就是一排，也就是平坦化的由来。

## 混淆效果

分析正常的控制流时，能很容易的分析出程序的执行顺序，以及每一段代码完成的工作（一段代码可能由多个相互关联的基本块组成），进而掌握整个程序的逻辑。

分析平坦化后的控制流时，在不知道基本块执行顺序的情况下，分别对每一个基本块进行分析是很难的，而如果要得知每一个基本块的执行顺序，必须分析分发块的调度逻辑。

实际上当函数比较复杂时，通过手动分析分发块还原原基本块的执行顺序是非常复杂的。

控制流平坦化混淆后的伪代码，while + switch 结构对应平坦化后的控制流结构。

![image-20230215152840664](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215152840664.png)

# 控制流平坦化代码实现思路

## 架构

+ 入口块

+ 分发块

+ 返回块

+ 原基本块

## 实现步骤

### 第一步：保存原基本块

将除入口块以外的基本块保存到 vector 容器中，方便后续处理。

如果入口块的终结指令是条件分支指令，则将该指令单独分离出来作为一个基本块，加入到 vector 容器的最前面。

> 为了保证入口块的最后一条指令一定是一条非条件跳转指令，保证其只有一个后继块。

![image-20230215155701008](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215155701008.png)

```c++
//将除入口块以外的基本块保存到 vector 容器中，方便后续处理
// 首先保存所有基本块
vector<BasicBlock*> origBB;
for(BasicBlock &BB : F){
    origBB.push_back(&BB);
}
// 从 vector 中去除第一个基本块
// 因为第一个基本块一定是入口块
origBB.erase(origBB.begin());
BasicBlock &entryBB = F.getEntryBlock();
// 判断：如果第一个基本块的末尾是条件跳转 -> 单独分离
// dyn_cast：用来类型判断和类型转换，如果给定参数（entryBB.getTerminator()）符合想要类型（BranchInst），进行转换，转换成（BranchInst *br），如果不符合类型，返回一个 nullptr 空指针
if(BranchInst *br = dyn_cast<BranchInst>(entryBB.getTerminator())){
    if(br->isConditional()){
        // 分离跳转指令作为新基本快，插入到 vector 容器最前端
        BasicBlock *newBB = entryBB.splitBasicBlock(br, "newBB");
        origBB.insert(origBB.begin(), newBB);
    }
}
```

`dyn_cast`函数：用来类型判断和类型转换，如果给定参数（`entryBB.getRerminator()`）符合想要类型（`BranchInst`），进行转换，转换成（`BranchInst *br`），如果不符合类型，返回一个 `nullptr` 空指针。

`isConditional`函数：判断是否是条件跳转指令。

### 第二步：创建分发块和返回块

除了原基本块之外，还要续创建一个分发块来调度基本块的执行顺序，并建立入口块到分发块的绝对跳转。

再创建一个返回块，原基本块执行完后都需要跳转到这个返回块，返回块会直接跳转到分发块。

![image-20230215160237600](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215160237600.png)

```C++
// 创建分发块和返回块
BasicBlock *dispatchBB = BasicBlock::Create(F.getContext(), "dispatchBB", &F, &entryBB);
BasicBlock *returnBB = BasicBlock::Create(F.getContext(), "returnBB", &F, &entryBB);
// 此时的块顺序如下
/*-----------------------
    分发块
    返回块
    入口块
-----------------------*/
// 建立分发块和返回块的链接
BranchInst::Create(dispatchBB, returnBB);
// 把入口块移到最前面，分发块前面
entryBB.moveBefore(dispatchBB);
// 此时的块顺序如下
/*-----------------------
    入口块
    分发块
    返回块
-----------------------*/
// 去除入口块末尾的跳转
entryBB.getTerminator()->eraseFromParent();
// 使入口块跳转到 dispatchBB，brDispatchBB 也就是入口块的终结指令
BranchInst *brDispatchBB = BranchInst::Create(dispatchBB, &entryBB);
```

`BasicBlock::Create`函数：创建基本块函数，第一个参数是 LLVM Context 类型，可用`getContext`方法获取；第二个参数是新建块的名称（`dispatchBB`）；第三个参数是函数指针，即在哪个函数（`F`）里面创建基本块；第四个参数指定创建的基本块被移动到哪个基本块（`entryBB`）的前面。

`BranchInst::Create(dispatchBB, returnBB)`无条件函数：在基本块`returnBB`的末尾添加一条`br`指令（无条件跳转）。即直接从基本块`returnBB`跳转到另一个基本块`dispatchBB`。

`BranchInst::Create(ForBodyBB, ForEndBB, Cmp, ForCondBB)`有条件函数：在基本块`ForCondBB`的末尾添加一条`br`指令（有条件跳转）。即如果局部变量`Cmp`所表示的值为`true`，则跳转到基本块`ForBodyBB`；否则，跳转到基本块`ForEndBB`。

`moveBefore`方法：移动一个基本块（`entryBB`）到另一个基本块（`dispatchBB`）前面。

`getTerminator`方法：获取基本块最后一条指令。

`eraseFromParent`方法：删除指令。

### 第三步：实现分发块调度

在入口块中创建并初始化 switch 变量，在调度块中插入 switch 指令实现分发功能。

将原基本块移动到返回块之前，并分配随机的 case 值，并将其添加到 switch 指令的分支中。

![image-20230215160649347](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215160649347.png)

```c++
// 在入口块插入 alloca 和 store 指令创建并初始化 switch 变量，初始值为随机值
int randNumCase = rand();
// 在入口块跳转分发块指令（brDispatchBB）之前插入一条申请分配内存的指令，使用 AllocaInst 的构造函数
AllocaInst *swVarPtr = new AllocaInst(TYPE_I32, 0, "swVar.ptr", brDispatchBB);
// 在入口块跳转分发块指令（brDispatchBB）之前插入一条内存存储的指令
new StoreInst(CONST_I32(randNumCase), swVarPtr, brDispatchBB);
// 在分发块插入 load 指令读取 switch 变量
LoadInst *swVar = new LoadInst(TYPE_I32, swVarPtr, "swVar", false, dispatchBB);
// 在返回块前创建 switch 默认跳转的基本块
BasicBlock *swDefault = BasicBlock::Create(F.getContext(), "seDefault", &F, returnBB);
// switch 默认跳转的基本块默认跳转到返回块
BranchInst::Create(returnBB, swDefault);
// 在分发块末尾的 switch 块中添加 switch 指令
SwitchInst *swInst = SwitchInst::Create(swVar, swDefault, 0, dispatchBB);
// 将原基本块插入到返回块之前，并分配 case 值
for(BasicBlock *BB : origBB){
    BB->moveBefore(returnBB);
    swInst->addCase(CONST_I32(randNumCase), BB);
    randNumCase = rand();
}
```

`addCase`方法，在基本块中添加对应 switch 指令的 case 值。

### 第四步：实现调度变量自动调整

在每个原基本块最后添加修改 switch 变量值的指令，以便返回分发块之后，能够正确执行到下一个基本块。

删除原基本块末尾的跳转，使其结束执行后跳转到返回块。

![image-20230215161306092](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215161306092.png)

```C++
// 在每个基本块最后添加修改 switch 变量的指令和跳转到返回块的指令
for(BasicBlock *BB : origBB){
    // retn BB
    if(BB->getTerminator()->getNumSuccessors() == 0){
        continue;
    }
    // 非条件跳转
    else if(BB->getTerminator()->getNumSuccessors() == 1){
        // 获取后继块
        BasicBlock *sucBB = BB->getTerminator()->getSuccessor(0);
        // 删除基本块最后一条跳转到后继块的指令
        BB->getTerminator()->eraseFromParent();
        // 获取后继块的 case 值，（常量类型）
        ConstantInt *numCase = swInst->findCaseDest(sucBB);
        // 把 switch 变量修改成它的后继块的 case 值，下一轮进入分发块就根据这个值跳转到后继块
        new StoreInst(numCase, swVarPtr, BB);
        // 基本块跳转到返回块
        BranchInst::Create(returnBB, BB);
    }
    // 条件跳转
    else if(BB->getTerminator()->getNumSuccessors() == 2){
        ConstantInt *numCaseTrue = swInst->findCaseDest(BB->getTerminator()->getSuccessor(0));
        ConstantInt *numCaseFalse = swInst->findCaseDest(BB->getTerminator()->getSuccessor(1));
        BranchInst *br = cast<BranchInst>(BB->getTerminator());
        // 创建 select 指令判断需要修改哪一个 case 值
        SelectInst *sel = SelectInst::Create(br->getCondition(), numCaseTrue, numCaseFalse, "", BB->getTerminator());
		// 删除基本块最后一条跳转到后继块的指令
        BB->getTerminator()->eraseFromParent();
		// 把 switch 变量修改成它的后继块的 case 值，下一轮进入分发块就根据这个值跳转到后继块
        new StoreInst(sel, swVarPtr, BB);
        // 基本块跳转到返回块
        BranchInst::Create(returnBB, BB);
    }
}
```

`getNumSuccessors`方法：获取后继块的数量。为 0 表示后续只有一条 return 指令；为 1 表示为非条件跳转，后续有一个后继块；为 2 表示为条件跳转，后续有两个后继块。

`findCaseDest`方法：寻找基本块中 switch case 值，返回值为 ConstantInt 类型。

`getCondition`方法：获取跳转条件。

### 第五步：修复 PHI 指令和逃逸变量

PHI 指令的值由前驱块决定，平坦化后所有原基本块的前驱块都变成了分发块，因此 PHI 指令发生了损坏。

逃逸变量指在一个基本块中定义，并且在另一个基本块被引用的变量。在原程序中某些基本块可能引用之前某个基本块中的变量，平坦化后原基本块之间不存在确定的前后关系（由分发块决定），因此某些变量的引用可能会损坏，在编译时会出现分不清定义和引用顺序的问题。

修复的方法是，**调用`DemotePHIToStack`、`DemotePHIToStack`这两个函数将 PHI 指令和逃逸变量都转化为内存存取指令（alloca、store、load）**。Demote 是降级的意思，`DemoteToStack`就是用 alloca, store, load 三类内存访问指令来代替之前的 PHI 指令。为什么是 Stack 呢，因为 LLVM IR 中的 alloca 指令是在栈中进行分配的，这点不同于C语言中的 malloc 函数。将所有 PHI 指令用三类内存访问指令表示，并将所有 alloca 指令都放在入口块，PHI 指令的错误就被修复了。

```c++
void Flattening::fixStack(Function &F){
    vector<PHINode*> origPHI;
    vector<Instruction*> origReg;
    BasicBlock &entryBB = F.getEntryBlock();
    for(BasicBlock &BB : F){
        for(Instruction &I : BB){
            if(!PHINode *PN = dyn_cast<PHINode>(&I)){
                origPHI.push_back(PN);
            }else if(!(isa<AllocaInst>(&I) && I.getParent() == &entryBB) && I.isUsedOutsideOfBlock(&BB)){
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
```

判断逃逸变量代码分析：`if(!(isa<AllocaInst>(&I) && I.getParent() == &entryBB) && I.isUsedOutsideOfBlock(&BB))`：

指令 I 判断为逃逸变量需要同时满足两个条件：

+ 不能是内存申请指令且不在入口块内
+ `isUseOutsideOfBlock`函数判断为真，这个函数用于判断指令 I 是否在其他基本块中被使用

`DemotePHIToStack`函数：在栈上申请一块内存存放 phi 指令，修复所有引用了当前指令的指令，返回一个指针。

`DemoteRegToStack`函数：在栈上申请一块内存存放逃逸变量，修复所有引用了当前变量的指令，返回一个指针。

OLLVM中的`fixStack`函数还引用了一个`valueEscape`函数：

```c++
bool valueEscapes(Instruction *Inst) {
  BasicBlock *BB = Inst->getParent();
  for (Value::use_iterator UI = Inst->use_begin(), E = Inst->use_end(); UI != E;
       ++UI) {
    Instruction *I = cast<Instruction>(*UI);
    if (I->getParent() != BB || isa<PHINode>(I)) {
      return true;
    }
  }
  return false;
}
...
 
        if (!(isa<AllocaInst>(j) && j->getParent() == bbEntry) &&
            (valueEscapes(&*j) || j->isUsedOutsideOfBlock(&*i))) {
 
...
```

`valueEscapes`函数是用来判断指令使用的操作数中是否包含逃逸变量以及 PHINode，但事实上修复PHI指令和逃逸变量的`DemotePHIToStack`以及`DemoteRegToStack`两个函数在修复当前指令的同时还会修复所有引用了当前指令的指令（详见llvm/lib/Transforms/Utils/DemoteRegToStack.cpp源代码）。

> `DemoteRegisterToMemoryPass`这个 pass 实现了修复逃逸变量和 PHI 指令的功能，具体实现在`Reg2Mem.cpp`文件里：[Reg2Mem.cpp地址]([http://formalverification.cs.utah.edu/llvm_doxy/2.9/Reg2Mem_8cpp_source.html)
>
> 但是本质上好像还是调用`valueEscapes`、`DemotePHIToStack`、`DemoteRegToStack`这三个函数来遍历和判断指令，只是被封装成了一个 pass。
>
> 参考：
>
> https://bbs.kanxue.com/thread-268789-1.htm
>
> https://roife.github.io/2022/02/07/mem2reg/
>
> https://blog.csdn.net/yeshahayes/article/details/97018670
>
> http://formalverification.cs.utah.edu/llvm_doxy/2.9/Reg2Mem_8cpp_source.html
>
> https://llvm.org/doxygen/DemoteRegToStack_8cpp_source.html
>
> https://cloud.tencent.com/developer/inventory/533/article/1645780

# 控制流平坦化代码实现

## Flattening.cpp

```c++
#include "llvm/IR/Function.h"
#include "llvm/Pass.h"
#include "llvm/IR/LegacyPassManager.h"
#include "llvm/Transforms/IPO/PassManagerBuilder.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Transforms/Utils/Local.h"
#include "../include/SplitBasicBlock.h"
#include "../include/Utils.h"
#include <vector>
#include <cstdlib>
#include <ctime>
using namespace llvm;
using std::vector;

namespace
{
    class Flattening : public FunctionPass{
        public:
            static char ID;
            Flattening() : FunctionPass(ID) {
                srand(time(0));
            }
            
            // 对函数 F 进行平坦化
            void flatten(Function &F);

            bool runOnFunction(Function &F);
    };
} // namespace

// runOnFunction函数实现
bool Flattening :: runOnFunction(Function &F){
    INIT_CONTEXT(F);
    FunctionPass *pass = createSplitBasicBlockPass();
    pass->runOnFunction(F);
    flatten(F);
    return true;
}

void Flattening::flatten(Function &F){
    // 基本块数量不超过1则无需平坦化
    if(F.size() <= 1){
        return;
    }

    //将除入口块以外的基本块保存到 vector 容器中，方便后续处理
    // 首先保存所有基本块
    vector<BasicBlock*> origBB;
    for(BasicBlock &BB : F){
        origBB.push_back(&BB);
    }
    // 从 vector 中去除第一个基本块
    // 因为第一个基本块一定是入口块
    origBB.erase(origBB.begin());
    BasicBlock &entryBB = F.getEntryBlock();
    // 判断：如果第一个基本块的末尾是条件跳转 -> 单独分离
    // dyn_cast：用来类型判断和类型转换，如果给定参数（entryBB.getRerminator()）符合想要类型（BranchInst），进行转换，转换成（BranchInst *br），如果不符合类型，返回一个 nullptr 空指针
    if(BranchInst *br = dyn_cast<BranchInst>(entryBB.getTerminator())){
        if(br->isConditional()){
            // 分离跳转指令作为新基本快，插入到 vector 容器最前端
            BasicBlock *newBB = entryBB.splitBasicBlock(br, "newBB");
            origBB.insert(origBB.begin(), newBB);
        }
    }

    // 创建分发块和返回块
    BasicBlock *dispatchBB = BasicBlock::Create(*CONTEXT, "dispatchBB", &F, &entryBB);
    BasicBlock *returnBB = BasicBlock::Create(*CONTEXT, "returnBB", &F, &entryBB);
    // 此时的块顺序如下
    /*-----------------------
        分发块
        返回块
        入口块
    -----------------------*/
    // 建立分发块和返回块的链接
    BranchInst::Create(dispatchBB, returnBB);
    // 把入口块移到最前面，分发块前面
    entryBB.moveBefore(dispatchBB);
    // 此时的块顺序如下
    /*-----------------------
        入口块
        分发块
        返回块
    -----------------------*/
    // 去除入口块末尾的跳转
    entryBB.getTerminator()->eraseFromParent();
    // 使入口块跳转到 dispatchBB，brDispatchBB 也就是入口块的终结指令
    BranchInst *brDispatchBB = BranchInst::Create(dispatchBB, &entryBB);

    // 在入口块插入 alloca 和 store 指令创建并初始化 switch 变量，初始值为随机值
    int randNumCase = rand();
    // 在入口块跳转分发块指令（brDispatchBB）之前插入一条申请分配内存的指令，使用 AllocaInst 的构造函数
    AllocaInst *swVarPtr = new AllocaInst(TYPE_I32, 0, "swVar.ptr", brDispatchBB);
    // 在入口块跳转分发块指令（brDispatchBB）之前插入一条内存存储的指令
    new StoreInst(CONST_I32(randNumCase), swVarPtr, brDispatchBB);
    // 在分发块插入 load 指令读取 switch 变量
    LoadInst *swVar = new LoadInst(TYPE_I32, swVarPtr, "swVar", false, dispatchBB);
    // 在返回块前创建 switch 默认跳转的基本块
    BasicBlock *swDefault = BasicBlock::Create(*CONTEXT, "seDefault", &F, returnBB);
    // switch 默认跳转的基本块默认跳转到返回块
    BranchInst::Create(returnBB, swDefault);
    // 在分发块末尾的 switch 块中添加 switch 指令
    SwitchInst *swInst = SwitchInst::Create(swVar, swDefault, 0, dispatchBB);
    // 将原基本块插入到返回块之前，并分配 case 值
    for(BasicBlock *BB : origBB){
        BB->moveBefore(returnBB);
        swInst->addCase(CONST_I32(randNumCase), BB);
        randNumCase = rand();
    }

    // 在每个基本块最后添加修改 switch 变量的指令和跳转到返回块的指令
    for(BasicBlock *BB : origBB){
        // retn BB
        if(BB->getTerminator()->getNumSuccessors() == 0){
            continue;
        }
        // 非条件跳转
        else if(BB->getTerminator()->getNumSuccessors() == 1){
            // 获取后继块
            BasicBlock *sucBB = BB->getTerminator()->getSuccessor(0);
            // 删除基本块最后一条跳转到后继块的指令
            BB->getTerminator()->eraseFromParent();
            // 获取后继块的 case 值，（常量类型）
            ConstantInt *numCase = swInst->findCaseDest(sucBB);
            // 把 switch 变量修改成它的后继块的 case 值，下一轮进入分发块就根据这个值跳转到后继块
            new StoreInst(numCase, swVarPtr, BB);
            // 基本块跳转到返回块
            BranchInst::Create(returnBB, BB);
        }
        // 条件跳转
        else if(BB->getTerminator()->getNumSuccessors() == 2){
            ConstantInt *numCaseTrue = swInst->findCaseDest(BB->getTerminator()->getSuccessor(0));
            ConstantInt *numCaseFalse = swInst->findCaseDest(BB->getTerminator()->getSuccessor(1));
            BranchInst *br = cast<BranchInst>(BB->getTerminator());
            // 创建 select 指令判断需要修改哪一个 case 值
            SelectInst *sel = SelectInst::Create(br->getCondition(), numCaseTrue, numCaseFalse, "", BB->getTerminator());
            // 删除基本块最后一条跳转到后继块的指令
            BB->getTerminator()->eraseFromParent();
            // 把 switch 变量修改成它的后继块的 case 值，下一轮进入分发块就根据这个值跳转到后继块
            new StoreInst(sel, swVarPtr, BB);
            // 基本块跳转到返回块
            BranchInst::Create(returnBB, BB);
        }
    }
    fixStack(F);
}

// https://www.leadroyal.cn/p/1072/
// 方案一： 注册阶段，将LowerSwitchPass放到Flatten前，执行时按顺序执行即可。
#if LLVM_VERSION_MAJOR >= 9
  	// FIXME: Pass has not been inserted into a PassManager object!
    // >=9.0, LowerSwitchPass depends on LazyValueInfoWrapperPass, which cause AssertError.
    // So I move LowerSwitchPass into register function, just before FlatteningPass.
#else
    FunctionPass *lower = createLowerSwitchPass();
    lower->runOnFunction(*F);
#endif

char Flattening :: ID = 0;
// 注册该 Flattening Pass
static RegisterPass<Flattening> x("fla", "My control flow flattening obfuscation.");
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
}

#endif
```
