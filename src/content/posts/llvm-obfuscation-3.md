---
title: "llvm代码混淆学习（三）"
published: 2023-02-08
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

>写在前面
>
>随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# 基本块分割

基本块分割即将一个基本块分割为等价的若干个基本块，在分割后的基本块之间加上无条件跳转。

基本块分割不能算是混淆，但是可以提高某些代码混淆的混淆效果。

![image-20230208005757996](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230208005757996.png)

## 为什么要分割

在许多基于基本块的代码混淆中，基本块数量越多，代码混淆后的复杂度越大。

通过增加基本块的数量，可以到达提高混淆效果的目的。

![image-20230208005944236](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230208005944236.png)

## 实现思路

遍历每个函数中的每个基本块，对每个基本块进行分割即可。

> 有 PHI 指令的基本块选择跳过
>
> 因为 PHI 值根据前驱块指定，分割带有 PHI 指令的基本块可能会改变其前驱块，导致带有 PHI 指令的基本块的前驱块是分割前的同一个基本块

## 使用到的 API

+ 额外参数指定

可以通过 **cl::opt** 模板类获取指令中的参数，这里的 opt 是选项 option 的缩写，不是优化器的意思：

```c++
#include "llvm/Support/CommandLine.h"

// 可选的参数，指定一个基本块会被分裂成几个基本块，默认值为 2
static cl::opt<int> splitNum("split_num", cl::init(2), cl::desc("Split <split_num> time(s) each BB"));

// 命令：
opt -load ../Build/LLVMObfuscator.so -split -split_num 5 -S TestProgram.ll -o TestProgram_split.ll
```

+ splitBasicBlock 函数

splitBasicBlock 函数是 BasicBlock 类的一个成员函数。在BasicBlock.h 头文件里可以看到这个函数的两种用法：

![image-20230208143330733](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230208143330733.png)

将一个基本块，在指令 I 处一分为二，指令 I 之前的指令会被放在第一个基本块里，包括指令 I 的后面指令 放到第二个基本块里，最后在第一个基本块里建立绝对跳转

有两种用法，区别在第一个参数，第一种用迭代器，第二种用指针。

第二个参数是字符串，指定分裂出来的新基本块名称。

第三个参数用于改变两个基本块的顺序，为`true`时，第二个基本块会放到第一个基本块之前

返回结果是指向第二个基本块（新）的指针

代码片段分析：

```c++
void SplitBasicBlock::split(BasicBlock *BB){
    BasicBlock *curBB = BB;
    // 计算分裂后每个基本块的大小
    int splitSize = BB->size() / splitNum;
    if(splitSize){
        for(int i = 0;i < splitNum;i ++){
            int cnt = 0;
            for(Instruction &I : *curBB){
                if(++cnt == splitSize){
                    // 在 I 指令处对基本块进行分割
                    curBB = curBB->splitBasicBlock(&I);	// 传递指令 I 的指针地址，非引用
                    break;
                }
            }
        }
    }
}
```

+ isa <> 函数

isa<> 是一个模板函数，用于判断一个指针指向的数据的类型是不是给定的类型，类似于 Java 中的 instanceof

```c++
// 判断基本块中是否存在 PHI 指令
bool SplitBasicBlock::containsPHI(BasicBlock *BB){
    for(Instruction &I : *BB){
        if(isa<PHINode>(&I)){
            return true;
        }
    }
    return false;
}
```

## 代码实现

### 目录结构

+ Transforms
  + include
    + SplitBasicBlock.h
  + src
    + SplitBasicBlock.cpp

### SplitBasicBlock.cpp

引入指令参数`splitNum`：

```c++
// 可选的参数，指定一个基本块会被分裂成几个基本块，默认值为 2
static cl::opt<int> splitNum("split_num", cl::init(2), cl::desc("Split<split_num> time(s) each BB"));
```

`SplitBasicBlock`类定义：

```c++
namespace{
    class SplitBasicBlock : public FunctionPass{
        public:
        	static char ID;
        	SplitBasicBlock() : FunctionPass(ID){
                
            }
        	bool runOnFunction(Function &F);
        
        	// 对单个基本块执行分裂操作
        	void split(BasicBlock *BB);
        
        	// 判断一个基本块中是否包含 PHI 指令（PHINode）
        	bool containsPHI(BasicBlock *BB);
    };
}
```

`runOnFunction`函数实现：

```c++
bool SplitBasicBlock::runOnFunction(Function &F){
    // 第一步：保存原先的所有基本块
    vector<BasicBlock*> origBB;
    for(BasicBlock &BB : F){
        origBB.push_back(&BB);
    }
    // 第二步：对每个不包含 PHI 指令的基本块执行分裂操作
    for(BasicBlock *BB : origBB){
        if(!containsPHI(BB)){
            split(BB);
        }
    }
    return true;
}
```

> 为什么要先把所有基本块保存到 vector 容器中
>
> 因为要对基本块进行分割操作，分割时基本块数量会增多，所以需要把原先所有基本块保存到一个 vector 容器中，在容器中进行分裂操作不会影响 foreach 遍历

`containsPHI`函数实现：

```c++
bool SplitBasicBlock::containsPHI(BasicBlock *BB){
    for(Instruction &I : *BB){
        if(isa<PHINode>(&I)){
            return true;
        }
    }
    return false
}
```

`split`函数实现：

```c++
void SplitBasicBlock::split(BasicBlock *BB){
    // 计算分裂后每个基本块的大小
    // 原基本块的大小 / 分裂数目（向上取整）
    int splitSize = (BB->size() + splitNum - 1) / splitNum;
    BasicBlock *curBB = BB;
    for(int i = 1;i < splitNum;i++){
        int cnt = 0;
        for(Instruction &I : *curBB){
            if(cnt++ == splitSize){
                // 在 I 指令处对基本块进行分割
                curBB = curBB->splitBasicBlock(&I);
                break;
            }
        }
    }
}
```

初始化 ID 并注册：

```c++
char SplitBasicBlock::ID = 0;
static RegisterPass<SplitBasicBlock> x("split", "Split a basic block into multiple basic blocks.");
```

完整代码：

```c++
#include "llvm/Pass.h"
#include "llvm/IR/Function.h"
#include "llvm/IR/Instructions.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/Support/CommandLine.h"
#include "../include/SplitBasicBlock.h"
#include <vector>
using std::vector;
using namespace llvm;

// 可选的参数，指定一个基本块会被分裂成几个基本块，默认值为 2
static cl::opt<int> splitNum("split_num", cl::init(2), cl::desc("Split<split_num> time(s) each BB"));

namespace
{
    class SplitBasicBlock : public FunctionPass{
        public:
            static char ID;
            SplitBasicBlock() : FunctionPass(ID) {}

            bool runOnFunction(Function &F);

            bool containsPHI(BasicBlock *BB);

            void split(BasicBlock *BB);
    };
} // namespace

// runOnFunction函数实现
bool SplitBasicBlock :: runOnFunction(Function &F){
    vector<BasicBlock*> origBB;
    for(BasicBlock &BB : F){
        origBB.push_back(&BB);
    }
    for(BasicBlock *BB : origBB){
        if(!containsPHI(BB)){
            split(BB);
        }
    }
}

bool SplitBasicBlock::containsPHI(BasicBlock *BB){
    for(Instruction &I : *BB){
        if(isa<PHINode>(&I)){
            return true;
        }
    }
    return false;
}

void SplitBasicBlock::split(BasicBlock *BB){
    int splitSize = (BB->size() + splitNum - 1) / splitNum;
    BasicBlock *curBB = BB;
    for(int i = 1;i < splitNum; i++){
        int cnt = 0;
        for(Instruction &I : *curBB){
            if(cnt++ == splitSize){
                curBB = curBB->splitBasicBlock(&I);
                break;
            }
        }
    }
}

FunctionPass* createSplitBasicBlockPass(){
    return new SplitBasicBlock();
}

char SplitBasicBlock :: ID = 0;
// 注册该 SplitBasicBlock Pass
static RegisterPass<SplitBasicBlock> x("split", "Split a basic block into multiple basic blocks.");
```

### SplitBasicBlock.h

在 llvm 命名空间里添加一个函数`FunctionPass* createSplitBasicBlockPass()`

这个函数将在`SplitBasicBlock.cpp`里实现

这样的话其他 LLVM Pass 就可以通过引入头文件`SplicBasicBlock.h`调用`createSplitBasicBlockPass`函数来创建一个`SplitBasicBlock`Pass，完成基本块的分割

```c++
#include "llvm/IR/Function.h"
#include "llvm/Pass.h"

namespace llvm{
    FunctionPass* createSplitBasicBlockPass();
}
```

在`SplitBasicBlock.cpp`中实现`llvm::createSplitBasicBlock`函数：

```c++
FunctionPass* llvm::createSplitBasicBlockPass(){
    return new SplitBasicBlock();
}
```

完整代码：

```c++
#ifndef _SPLIT_BASIC_BLOCK_H_	// 防止重复导入头文件
#define _SPLIT_BASIC_BLOCK_H_
#include "llvm/IR/Function.h"
#include "llvm/Pass.h"
namespace llvm
{
    FunctionPass* createSplitBasicBlockPass();
} // namespace llvm
#endif
```
