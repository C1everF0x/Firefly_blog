---
title: "llvm代码混淆学习（二）"
published: 2023-02-07
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

>写在前面
>
>随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# LLVM Pass 常用 API

LLVM Pass 框架中，三个最核心的类是 `Function`、`BasicBlock`和`Instruction`，分别对应 LLVM IR 中的函数、基本块和指令，还有一个基本类`Value`，所有可以被当作指令操作数的类型都是 `Value` 的子类

## Function 类

与 Function 有关的操作主要是获取函数的一些属性，比如名称等等，以及对函数中基本块的遍历：

+ 获取函数名称：F.getName()
+ 获取入口快：F.getEntryBlock()
+ 函数中基本块的遍历

可以通过 foreach 循环对函数 Function 中的每个基本块 BasicBlock 进行遍历

```c++
bool runOnFunction(Function &F){	// 使用引用是为了能修改传入参数Function类
    for(BasicBlock &BB : F){		// 遍历F中的基本块，同样使用引用
        // to do
    }
}
```

## BasicBlock 类

与 BasicBlcok 有关的操作主要是基本块的克隆、分裂、移动等，以及对基本块中指令的遍历：

+ 获取基本块名称：BB.getName()
+ 获取基本块的终结指令：BB.getTerminator()
+ 基本块的克隆
+ 基本块的分裂
+ 基本块的移动
+ 基本块中指令的遍历

可以通过 foreach 循环对基本块 BasickBlock 中的每个指令 Instruction 进行遍历

```c++
bool runOnFunction(Function &F){	// 使用引用是为了能修改传入参数Function类
    for(BasicBlock &BB : F){		// 遍历F中的基本块，同样使用引用
        for(Instruction &I : BB){	// 遍历BB中的指令，同样使用引用
            // to do
        }
    }
}
```

## Instruction 类

指令可以有很多种，亦即 Instruction 类可以拥有多个子类，如：BinaryOpterator, AllocaInst, BranchInst 等

+ 二元运算：BinaryOperator
+ 内存访问和寻址：
  + Allocalnst
  + StoreInst
  + LoadInst
+ 分支指令：
  + Branchlnst
  + Switchlnst
+ 其他指令
  + Calllnst
  + ICmplnst
  + PHINode

与 Instruction 有关的操作主要是指令的创建、删除、修改以及指令中操作数的遍历：

可以通过 for 循环对指令 Instruction 中的每个操作数 Value* 进行遍历

```c++
bool runOnFunction(Function &F){	// 使用引用是为了能修改传入参数Function类
    for(BasicBlock &BB : F){		// 遍历F中的基本块，同样使用引用
        for(Instruction &I : BB){	// 遍历BB中的指令，同样使用引用
            for(int i = 0;i < I.getNumOperands(); i++){
                Value *V = I.getOperand(i);
                // to do
            }
        }
    }
}
```

## Value 类

所有可以被当做**指令操作数**的类型都是 Value 的子类，Value 有以下五种类型的子类

+ 常量：Constant
+ 参数：Argument
+ 指令（运算结果）：Instruction
+ 函数（指针）：Function
+ 基本块：BasicBlock

## 输出流

在 C++ 中可以通过 cout, cerr, clog 输出流来进行打印，在 LLVM 中则建议使用 outs(), errs(), dbgs() 三个函数来获取输出流，然后打印

```c++
bool runOnFunction(Function &F){
	// 一般信息打印
    outs() << "Function: " << F.getName() << "\n";
    // 错误信息打印 if something wrong
    errs() << "Something wrong." << "\n";
    // 调试信息打印 debug
    dbgs() << "Debug" << "\n";
}
```

# LLVM 部分相关文档

![image-20230208005218987](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230208005218987.png)
