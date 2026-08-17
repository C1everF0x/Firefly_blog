---
title: "llvm代码混淆学习（七）"
published: 2023-02-20
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

> 写在前面
>
> 随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# 指令替代原理分析

## 概述

指令替代指将正常的二元运算指令（如加法、减法、异或等等），替换为等效而更复杂的指令序列，以达到混淆计算过程的目的。

例如，将 `a + b` 替换为 `a - (-b)`，将 `a ^ b` 替换为 `(~a & b) | (a & ~b)`等等。

仅支持整数运算的替换，因为替换浮点指令会造成舍入错误和误差。

## 混淆效果

函数的控制流并没有发生变化，但是运算过程变得难以分辨：

![image-20230222233422164](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230222233422164.png)

## 原理

扫描所有指令，对目标指令（加法、减法、与或非、异或）进行替换：

```c++
bool Substitution::runOnFunction(Function &F){
    for(int i = 0;i < ObfuTime;i ++){
        for(BasicBlock &BB : F){
            vector<Instruction*> origInst;
            for(Instruction &I : BB){
                origInst.push_back(&I);
            }
            for(Instruction *I : origInst){
                if(isa<BinaryOperator>(I)){
                    BinaryOperator *BI = cast<BinaryOperator>(I);
                    substitute(BI);
                }
            }
        }
    }
}
```

# 指令替代代码实现思路

## 加法替换

对于 `a = b + c`，实现四种替换方案：

+ addNeg：`a = b - (-c)`
+ addDoubleNeg：`a = -(-b + (-c))`
+ addRand：`r = rand(); a = b + r; a = a + c; a = a - r`
+ addRand2：`r = rand(); a = b - r; a = a + c; a = a + r`

## 减法替换

对于`a = b - c`，实现三种替换方案：

+ subNeg：`a = b + (-c)`
+ subRand：`r = rand(); a = b + r; a = a - c; a = a - r`
+ subRand2：`r = rand(); a = b - r; a = a - c; a = a + r`

## 与替换

对于`a = b & c`，实现两种替换方案：

+ andSubstitute：`a = (b ^ ~c) & b`
+ andSubstituteRand：`r = rand(); a = ~(~b | ~c) & (r | ~r)`

## 或替换

对于`a = b | c`，实现两种替换方案：

+ orSubstitute：`a = (b & c) | (b ^ c)`
+ orSubstituteRand：`r = rand(); a = ~(~b & ~c) & (r | ~r)`

## 异或替换

对于`a = b ^ c`，实现两种替换方案：

+ xorSubstitute：`a = (~a & b) | (a & ~b)`
+ xorSunstituteRand：`r = rand(); a = (b ^ r) ^ (c ^ r) <=> a = (~b & r | b & ~r) ^ (~c & r | c & ~r)`

# 指令替代代码实现

## Substitution.cpp

`replaceAllUsesWith`方法：使用传入的指令替换所有用到了原指令的地方。

 ```c++
#include "llvm/IR/Function.h"
#include "llvm/Pass.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/IR/Instructions.h"
#include "llvm/Support/CommandLine.h"
#include "Utils.h"
#include <vector>
#include <cstdlib>
#include <ctime>
using namespace llvm;
using std::vector;

#define NUMBER_ADD_SUBST 4
#define NUMBER_SUB_SUBST 3
#define NUMBER_AND_SUBST 2
#define NUMBER_OR_SUBST 2
#define NUMBER_XOR_SUBST 2

// 混淆次数，混淆次数越多混淆结果越复杂
static cl::opt<int> ObfuTime("sub_loop", cl::init(1), cl::desc("Obfuscate a function <obfu_time> time(s)."));

namespace{
    class Substitution : public FunctionPass {
        public:
            static char ID;
            Substitution() : FunctionPass(ID) {
                srand(time(NULL));
            }

            bool runOnFunction(Function &F);

            void substitute(BinaryOperator *BI);

            // 替换 Add 指令
            void substituteAdd(BinaryOperator *BI);
            // 加法替换：a = b + c -> a = b - (-c)
            void addNeg(BinaryOperator *BI);
            // 加法替换：a = b + c -> a = -(-b + (-c))
            void addDoubleNeg(BinaryOperator *BI);
            // 加法替换：a = b + c -> r = rand (); a = b + r; a = a + c; a = a - r
            void addRand(BinaryOperator *BI);
            // 加法替换：a = b + c -> r = rand (); a = b - r; a = a + b; a = a + r
            void addRand2(BinaryOperator *BI);

            // 替换 Sub 指令
            void substituteSub(BinaryOperator *BI);
            // 减法替换：a = b - c -> a = b + (-c)
            void subNeg(BinaryOperator *BI);
            // 减法替换：a = b - c -> r = rand (); a = b + r; a = a - c; a = a - r
            void subRand(BinaryOperator *BI);
            // 减法替换：a = b - c -> a = b - r; a = a - c; a = a + r
            void subRand2(BinaryOperator *BI);

            // 替换 And 指令
            void substituteAnd(BinaryOperator *BI);
            // 与替换：a = b & c -> a = (b ^ ~c) & b
            void andSubstitute(BinaryOperator *BI);
            // 与替换：a = b & c -> a = ~(~b | ~c) & (r | ~r)
            void andSubstituteRand(BinaryOperator *BI);
            
            // 替换 Or 指令
            void substituteOr(BinaryOperator *BI);
            // 或替换：a = b | c -> a = (b & c) | (b ^ c)
            void orSubstitute(BinaryOperator *BI);
            // 或替换：a = b | c -> a = ~(~b & ~c) & (r | ~r)
            void orSubstituteRand(BinaryOperator *BI);

            // 替换 Xor 指令
            void substituteXor(BinaryOperator *BI);
            // 异或替换：a = b ^ c -> a = ~b & c | b & ~c
            void xorSubstitute(BinaryOperator *BI);
            // 异或替换：a = b ^ c -> (b ^ r) ^ (c ^ r) <=> (~b & r | b & ~r) ^ (~c & r | c & ~r)
            void xorSubstituteRand(BinaryOperator *BI);
    };
}

bool Substitution::runOnFunction(Function &F){
    for(int i = 0;i < ObfuTime;i ++){
        for(BasicBlock &BB : F){
            vector<Instruction*> origInst;
            for(Instruction &I : BB){
                origInst.push_back(&I);
            }
            for(Instruction *I : origInst){
                if(isa<BinaryOperator>(I)){
                    BinaryOperator *BI = cast<BinaryOperator>(I);
                    substitute(BI);
                }
            }
        }
    }
}

void Substitution::substitute(BinaryOperator *BI){
    bool flag = true;
    // getOpcode方法获取指令类型，根据 加 减 与 或 非 五种指令类型调用对应混淆算法
    switch (BI->getOpcode()) {
        case BinaryOperator::Add:
            substituteAdd(BI);
            break;
        case BinaryOperator::Sub:
            substituteSub(BI);
            break;
        case BinaryOperator::And:
            substituteAnd(BI);
            break;
        case BinaryOperator::Or:
            substituteOr(BI);
            break;
        case BinaryOperator::Xor:
            substituteXor(BI);
            break;
        default:
            flag = false;
            break;
    }
    if(flag){
        BI->eraseFromParent();
    }
}


void Substitution::substituteAdd(BinaryOperator *BI){
    int choice = rand() % NUMBER_ADD_SUBST;
    switch (choice) {
        case 0:
            addNeg(BI);
            break;
        case 1:
            addDoubleNeg(BI);
            break;
        case 2:
            addRand(BI);
            break;
        case 3:
            addRand2(BI);
            break;
        default:
            break;
    }
}

void Substitution::addNeg(BinaryOperator *BI){
    // a = b + c -> a = b - (-c)
    BinaryOperator *op;
    // Neg 取负数，取第二个操作数
    op = BinaryOperator::CreateNeg(BI->getOperand(1), "", BI);
    // 创建 b - (-c)
    op = BinaryOperator::CreateSub(BI->getOperand(0), op, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::addDoubleNeg(BinaryOperator *BI){
    // a = b + c -> a = -(-b + (-c))
    BinaryOperator *op, *op1, *op2;
    // b 取负
    op1 = BinaryOperator::CreateNeg(BI->getOperand(0), "", BI);
    // c 取负
    op2 = BinaryOperator::CreateNeg(BI->getOperand(1), "", BI);
    // 创建 -b + (-c)
    op = BinaryOperator::CreateAdd(op1, op2, "", BI);
    // -b + (-c) 取负
    op = BinaryOperator::CreateNeg(op, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::addRand(BinaryOperator *BI){
    // a = b + c -> r = rand (); a = b + r; a = a + c; a = a - r
    // llvm::Value有一个llvm::Type*,getType方法可以获取其类型
    // (ConstantInt*)是强制类型转换
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1, *op2;
    // b + r
    op = BinaryOperator::CreateAdd(BI->getOperand(0), r, "", BI);
    // b + r + c
    op = BinaryOperator::CreateAdd(op, BI->getOperand(1), "", BI);
    // b + r + c - r = b + c
    op = BinaryOperator::CreateSub(op, r, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::addRand2(BinaryOperator *BI){
    // a = b + c -> r = rand (); a = b - r; a = a + c; a = a + r
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1, *op2;
    // b - r
    op = BinaryOperator::CreateSub(BI->getOperand(0), r, "", BI);
    // b - r + c
    op = BinaryOperator::CreateAdd(op, BI->getOperand(1), "", BI);
    // b - r + c + r
    op = BinaryOperator::CreateAdd(op, r, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::substituteSub(BinaryOperator *BI){
    int choice = rand() % NUMBER_SUB_SUBST;
    switch (choice) {
        case 0:
            subNeg(BI);
            break;
        case 1:
            subRand(BI);
            break;
        case 2:
            subRand2(BI);
            break;
        default:
            break;
    }
}

void Substitution::subNeg(BinaryOperator *BI){
    // a = b - c -> a = b + (-c)
    BinaryOperator *op;
    // -c
    op = BinaryOperator::CreateNeg(BI->getOperand(1), "", BI);
    // b + (-c)
    op = BinaryOperator::CreateAdd(BI->getOperand(0), op, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::subRand(BinaryOperator *BI){
    // a = b - c -> r = rand (); a = b + r; a = a - c; a = a - r
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1, *op2;
    // b + r
    op = BinaryOperator::CreateAdd(BI->getOperand(0), r, "", BI);
    // b + r - c
    op = BinaryOperator::CreateSub(op, BI->getOperand(1), "", BI);
    // b + r - c - r
    op = BinaryOperator::CreateSub(op, r, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::subRand2(BinaryOperator *BI){
    // a = b - c -> r = rand (); a = b - r; a = a - c; a = a + r
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1, *op2;
    // b - r
    op = BinaryOperator::CreateSub(BI->getOperand(0), r, "", BI);
    // b - r - c
    op = BinaryOperator::CreateSub(op, BI->getOperand(1), "", BI);
    // b - r - c + r
    op = BinaryOperator::CreateAdd(op, r, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::substituteXor(BinaryOperator *BI){
    int choice = rand() % NUMBER_XOR_SUBST;
    switch (choice) {
        case 0:
            xorSubstitute(BI);
            break;
        case 1:
            xorSubstituteRand(BI);
            break;
        default:
            break;
    }
}

void Substitution::xorSubstitute(BinaryOperator *BI){
    // a = b ^ c -> a = ~b & c | b & ~c
    BinaryOperator *op, *op1, *op2, *op3;
    // ~b
    op1 = BinaryOperator::CreateNot(BI->getOperand(0), "", BI);
    // ~b & c
    op1 = BinaryOperator::CreateAnd(op1, BI->getOperand(1), "", BI);
    // -c
    op2 = BinaryOperator::CreateNot(BI->getOperand(1), "", BI);
    // b & ~c
    op2 = BinaryOperator::CreateAnd(BI->getOperand(0), op2, "", BI);
    // ~b & c | b & ~c
    op = BinaryOperator::CreateOr(op1, op2, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::xorSubstituteRand(BinaryOperator *BI){
    // a = b ^ c -> r = rand (); (b ^ r) ^ (c ^ r) <=> (~b & r | b & ~r) ^ (~c & r | c & ~r)
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1, *op2, *op3;
    // ~b
    op1 = BinaryOperator::CreateNot(BI->getOperand(0), "", BI);
    // ~b & r
    op1 = BinaryOperator::CreateAnd(op1, r, "", BI);
    // ~r
    op2 = BinaryOperator::CreateNot(r, "", BI);
    // b & ~r
    op2 = BinaryOperator::CreateAnd(BI->getOperand(0), op2, "", BI);
    // ~b & r | b & ~r
    op = BinaryOperator::CreateOr(op1, op2, "", BI);
    // ~c
    op1 = BinaryOperator::CreateNot(BI->getOperand(1), "", BI);
    // ~c & r
    op1 = BinaryOperator::CreateAnd(op1, r, "", BI);
    // ~r
    op2 = BinaryOperator::CreateNot(r, "", BI);
    // c & ~r
    op2 = BinaryOperator::CreateAnd(BI->getOperand(1), op2, "", BI);
    // ~c & r | c & ~r
    op3 = BinaryOperator::CreateOr(op1, op2, "", BI);
    // (~b & r | b & ~r) ^ (~c & r | c & ~r)
    op = BinaryOperator::CreateXor(op, op3, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::substituteAnd(BinaryOperator *BI){
    int choice = rand() % NUMBER_AND_SUBST;
    switch (choice) {
        case 0:
            andSubstitute(BI);
            break;
        case 1:
            andSubstituteRand(BI);
            break;
        default:
            break;
    }
}

void Substitution::andSubstitute(BinaryOperator *BI){
    // a = b & c -> a = (b ^ ~c) & b
    BinaryOperator *op;
    // ~c
    op = BinaryOperator::CreateNot(BI->getOperand(1), "", BI);
    // b ^ ~c
    op = BinaryOperator::CreateXor(BI->getOperand(0), op, "", BI);
    // (b ^ ~c) & b
    op = BinaryOperator::CreateAnd(op, BI->getOperand(0), "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::andSubstituteRand(BinaryOperator *BI){
    // a = b & c -> r = rand (); a = ~(~b | ~c) & (r | ~r)
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1;
    // ~b
    op = BinaryOperator::CreateNot(BI->getOperand(0), "", BI);
    // ~c
    op1 = BinaryOperator::CreateNot(BI->getOperand(1), "", BI);
    // ~b | ~c
    op = BinaryOperator::CreateOr(op, op1, "", BI);
    // ~(~b | ~c)
    op = BinaryOperator::CreateNot(op, "", BI);
    // ~r
    op1 = BinaryOperator::CreateNot(r, "", BI);
    // r | ~r
    op1 = BinaryOperator::CreateOr(r, op1, "", BI);
    // ~(~b | ~c) & (r | ~r)
    op = BinaryOperator::CreateAnd(op, op1, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::substituteOr(BinaryOperator *BI){
    int choice = rand() % NUMBER_OR_SUBST;
    switch (choice) {
        case 0:
            orSubstitute(BI);
            break;
        case 1:
            orSubstituteRand(BI);
            break;
        default:
            break;
    }
}

void Substitution::orSubstitute(BinaryOperator *BI){
    // a = b | c -> a = (b & c) | (b ^ c)
    BinaryOperator *op, *op1;
    // b & c
    op = BinaryOperator::CreateAnd(BI->getOperand(0), BI->getOperand(1), "", BI);
    // b ^ c
    op1 = BinaryOperator::CreateXor(BI->getOperand(0), BI->getOperand(1), "", BI);
    // (b & c) | (b ^ c)
    op = BinaryOperator::CreateOr(op, op1, "", BI);
    BI->replaceAllUsesWith(op);
}

void Substitution::orSubstituteRand(BinaryOperator *BI){
    // a = b | c -> r = rand (); a = ~(~b & ~c) & (r | ~r)
    ConstantInt *r = (ConstantInt*)CONST(BI->getType(), rand());
    BinaryOperator *op, *op1;
    // ~b
    op = BinaryOperator::CreateNot(BI->getOperand(0), "", BI);
    // ~c
    op1 = BinaryOperator::CreateNot(BI->getOperand(1), "", BI);
    // ~b & ~c
    op = BinaryOperator::CreateAnd(op, op1, "", BI);
    // ~(~b & ~c)
    op = BinaryOperator::CreateNot(op, "", BI);
    // ~r
    op1 = BinaryOperator::CreateNot(r, "", BI);
    // r | ~r
    op1 = BinaryOperator::CreateOr(r, op1, "", BI);
    // ~(~b & ~c) & (r | ~r)
    op = BinaryOperator::CreateAnd(op, op1, "", BI);
    BI->replaceAllUsesWith(op);
}

char Substitution::ID = 0;
static RegisterPass<Substitution> X("sub", "Replace a binary instruction with equivalent instructions.");
 ```
