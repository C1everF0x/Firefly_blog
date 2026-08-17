---
title: "llvm代码混淆学习（一）"
published: 2023-02-03
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

>写在前面
>
>随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# LLVM IR 概述

+ 低级编程语言，类似汇编
+ 任何高级编程语言都可以用 LLVM IR 表示
+ 基于 LLVM IR 可以进行代码优化

## 两种表示方法

+ 人类可以阅读的文本形式，文件后缀为`.ll`
+ 易于机器处理的二进制格式，文件后缀为`.bc`

用`llvm-dis`和`llvm-as`可以相互转化

![image-20230206231754258](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230206231754258.png)

## 结构

源代码被编译为 LLVM IR 后，具有`模块 Module`，`函数 Function`和`基本块 BasicBlock`

### 模块

![image-20230206232105298](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230206232105298.png)

+ 一个源代码文件对应一个模块
+ 头部信息包含程序的目标平台，如 x86、arm 等，和一些其他信息
+ 全局符号包含**全局变量、函数的定义与声明**

### 函数

![image-20230206232217964](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230206232217964.png)

+ 函数指的是源代码中的**某个函数**
+ 参数即函数的**参数**
+ 一个函数由若干**基本块**组成，其中函数最先执行的基本块为**入口块**

### 基本块

![image-20230206232337419](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230206232337419.png)

+ 一个基本块由若干指令和标签组成
+ 正常情况下，基本块的最后一条指令为跳转指令(**br** 或 **switch**)，或返回指令(**retn**)，也叫作终结指令(Terminator Instruction)
+ PHI 指令是一种特殊的指令

## 代码混淆

基于 LLVM 的混淆，通常是以函数或者比函数更小的单位为基本单位进行混淆的，我们通常更关心函数和基本块这两个结构

+ 以函数为基本单位的混淆：控制流平坦化
+ 以基本块基本单位的混淆：虚假控制流
+ 以指令为基本单位的混淆：指令替代

# LLVM IR 常用指令含义及其用法

## 终结指令 Terminator Instructions

### ret 指令

+ 函数的返回指令，对应 C/C++ 中的 return

```assembly
ret <type> <value>	; 返回特定类型返回值的 return 指令
ret void			; 无返回值的 return 指令
例：
ret i32 5						; 返回整数 5
ret void						; 无返回值
ret { i32, i8 } { i32 4, i8 2 }	; 返回一个结构体
```

### br 指令

+ br 是”分支”的英文 branch 的缩写，分为非条件分支和条件分支，对应 C/C++ 的 if 语句
+ 无条件分支类似于x86汇编中的 jmp 指令，条件分支类似于x86汇编中的 jnz, je 等条件跳转指令

```assembly
br i1 <cond>, label <iftrue>, label <iffalse>	; 条件分支，i1 是条件，1 位整数
br label <dest>									; 无条件分支
例：
Test:
	%cond = icmp eq i32 %a, %b;
	br i1 %cond, label %IfEqual, label %IfUnequal
IfEqual:
	ret i32 1
IfUnEqual:
	ret i32 0
```

### swtich 指令

+ 分支指令，可看做是 br 指令的升级版，支持的分支更多，但使用也更复杂。对应 C/C++ 中的 switch

```assembly
switch <intty> <value>, label <defaultdest> [ <intty> <val>, label <dest> ...]
例：
; 与条件跳转等效
%Val = zext i1 %value to i32
switch i32 %Val, label %truedest [ i32 0, label %falsedest ]

; 与非条件跳转等效
switch i32 0, label %dest [ ]

; 拥有三个分支的条件跳转
switch i32 %val, label %otherwise [ i32 0, label %onzero
									i32 1, label %onone
									i32 2, label %ontwo ]
```

## 比较指令 Compere Instructions

常与 br 指令一起使用，如：`cmp`、`switch`、`test`

### icmp 指令

+ **整数或指针**的比较指令
+ 条件 cond 可以是 eq（相等），ne（不相等），ugt（无符号大于）等等

```assembly
<result> = icmp <cond> <type> <op1>, <op2>	; 比较整数 op1 和 op2 是否满足条件 cond
例：
<result> = icmp eq i32 4, 5		; yields: result=false eq=equal(相等)
<result> = icmp ne float* %X, %X; yields: result=false ne=not equal(不相等)
<result> = icmp ult i16 4, 5	; yields: result=true ult=unsigned less than(无符号小于)
<result> = icmp sgt i16 4, 5	; yields: result=false sgt=signed greater than(有符号大于)
<result> = icmp ule i16 -4, 5	; yields: result=false ule=unsigned less or equal(无符号小于等于)
<result> = icmp sge i16 4, 5	; yields: result=false sge=signed greater or equal(有符号大于等于)
```

### fcmp 指令

+ **浮点数**的比较指令
+ 条件 cond 可以是 oeq（ordered and equal）, ueq（unordered or equal）, false（必定不成立）等等
+ ordered 的意思是，两个操作数都不能为 **NAN**

```assembly
<result> = fcmp <cond> <type> <op1>, <op2>	; 比较浮点数 op1 和 op2 是否满足条件 cond
例：
<result> = fcmp oeq float 4.0, 5.0	; yields: result = false
<result> = fcmp one float 4.0, 5.0	; yields: result = true
<result> = fcmp olt float 4.0, 5.0	; yields: result = true
<result> = fcmp ueq double 1.0, 2.0	; yields: result = false
```

## 二元运算 Binary Operations

### add 指令

+ **整数**加法指令，对应 C/C++ 中的“+”操作符，类似x86汇编中的 add 指令

```assembly
<result> = add <type> <op1>, <op2>
例：
<result> = add i32 4, %var	; yields i32:result = 4 + %var
```

### sub 指令

+ **整数**减法指令，对应 C/C++ 中的“-”操作符，类似x86汇编中的 sub 指令

```assembly
<result> = sub <type> <op1>, <op2>
例：
<result> = sub i32 4, %var	; yields i32:result = 4 - %var
<result> = sub i32 0, %var	; yields i32:result = -%var
```

### mul 指令

+ **整数**乘法指令，对应 C/C++ 中的“*”操作符，类似x86汇编中的 mul 指令

```assembly
<result> = mul <type> <op1>, <op2>
例：
<result> = mul i32 4, %var	; yields i32:result = 4 * %var
```

### udiv 指令

+ **无符号整数**除法指令，对应 C/C++ 中的“/”操作符。如果存在exact关键字，且op1不是op2的倍数，就会出现错误

```assembly
<result> = udiv <type> <op1>, <op2>			; yields type:result
<result> = udiv exact <type> <op1>, <op2>	; yields type:result
例：
<result> = udiv i32 4, %var	; yields i32:result = 4 / %var
```

### sdiv 指令

+ **有符号整数**除法指令，对应 C/C++ 中的“/”操作符

```assembly
<result> = sdiv <type> <op1>, <op2>			; yields type:result
<result> = sdiv exact <type> <op1>, <op2>	; yields type:result
例：
<result> = sdiv i32 4, %var	; yields i32:result = 4 / %var
```

### urem 指令

+ **无符号整数**取余指令，对应 C/C++ 中的“%”操作符

```assembly
<result> = urem <type> <op1>, <op2>			; yields type:result
例：
<result> = urem i32 4, %var	; yields i32:result = 4 % %var
```

### srem 指令

+ **有符号整数**取余指令，对应 C/C++ 中的“%”操作符

```assembly
<result> = srem <type> <op1>, <op2>			; yields type:result
例：
<result> = srem i32 4, %var	; yields i32:result = 4 % %var
```

## 按位二元运算 Bitwise Binary Operations

### shl 指令

+ **整数**左移指令，对应 C/C++ 中的“<<”操作符，类似x86汇编中的 shl 指令

```assembly
<result> = shl <type> <op1>, <op2>
例：
<result> = shl i32 4, %var		; yields i32:result 4 << %var
<result> = shl i32 4, 2			; yields i32:result 16
<result> = shl i32 1, 10		; yields i32:result 1024
<result> = shl i32 1, 32		; undefined
<result> = shl <2 x i32> < i32 1, i32 1>, < i32 1, i32 2>	; yields: result = <2 x i32> < i32 2, i32 4>
```

### lshl 指令

+ 整数**逻辑右移**指令，对应 C/C++ 中的“>>”操作符，右移指定位数后在左侧补0

```assembly
<result> = lshl <type> <op1>, <op2>
例：
<result> = lshl i32 4, 1			; yields i32:result 2
<result> = lshl i32 4, 2			; yields i32:result 1
<result> = lshl i8 4, 3				; yields i8:result 0
<result> = lshl i8 -2, 1			; yields i8:result 0x7F
<result> = lshl i32 1, 32			; underfined
<result> = lshl <2 x i32> < i32 -2, i32 4>, < i32 1, i32 2>; yields: result = <2 x i32> < i32 0x7FFFFFFF, i32 1>

```

### ashr 指令

+ 整数**算数右移**指令，右移指定位数后在左侧补**符号位**（负数的符号位为1，正数的符号位为0）

```assembly
<result> = ashl <type> <op1>, <op2>
例：
<result> = ashl i32 4, 1			; yields i32:result 2
<result> = ashl i32 4, 2			; yields i32:result 1
<result> = ashl i8 4, 3				; yields i8:result 0
<result> = ashl i8 -2, 1			; yields i8:result -1
<result> = ashl i32 1, 32			; underfined
<result> = ashl <2 x i32> < i32 -2, i32 4>, < i32 1, i32 3>; yields: result = <2 x i32> < i32 -1, i32 0>
```

### and 指令

+ **整数**按位与运算指令，对应 C/C++ 中的“&”操作符。

```assembly
<result> = and <type> <op1>, <op2>	; yields type:result
例：
<result> = and i32 4, %var			; yields i32:result = 4 & %var
<result> = and i32 15, 40			; yields i32:result = 8
<result> = and i32 4, 8				; yields i32:result = 0
```

### or 指令

+ **整数**按位或运算指令，对应 C/C++ 中的“|”操作符

```assembly
<result> = or <type> <op1>, <op2>	; yields type:result
例：
<result> = or i32 4, %var			; yields i32:result = 4 | %var
<result> = or i32 15, 40			; yields i32:result = 47
<result> = or i32 4, 8				; yields i32:result = 12
```

### xor 指令

+ **整数**按位异或运算指令，对应 C/C++ 中的“^”操作符

```assembly
<result> = xor <type> <op1>, <op2>	; yields type:result
例：
<result> = xor i32 4, %var			; yields i32:result = 4 ^ %var
<result> = xor i32 15, 40			; yields i32:result = 39
<result> = xor i32 4, 8				; yields i32:result = 12
<result> = xor i32 %V, -1			; yields i32:result = ~%V
```

## 内存访问和寻址操作 Memory Access and Addressing Operations

### 静态单赋值

+ 在编译器设计中，静态单赋值（Static Single Assignment, SSA），是 IR 的一种属性
+ SSA 的特点是：**在程序中一个变量仅能有一条赋值语句**
+ LLVM IR 正是基于静态单赋值原则设计的

在下面这个程序流程图中，变量 x, y, w 都被赋值了两次，不满足 SSA

![image-20230207034908128](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230207034908128.png)

在下面这个程序流程图中，所有变量都只被赋值了一次，满足 SSA

![image-20230207034927020](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230207034927020.png)

### 由 SSA 引起的问题

假设 C++ 也是基于静态单赋值原则的（即一个变量只能被赋值一次），要怎样修改这个 for 循环，使其符合 SSA 原则？

```c++
#include <cstdio>

int main(){
    for(int i = 0;i < 100;i ++){
        printf("Hello, %d\n", i);
    }
}
```

以下是一种实现方式，也是 LLVM IR 采取的实现方式。在LLVM IR 中也有类似 malloc 和 指针操作 的指令

```c++
#include <cstdio>
#include <cstdlib>

int main(){
    int *i = (int*)malloc(4);
    for(*i = 0; *i < 100; (*i) ++){
        printf("Hello, %d\n", *i);
    }
}
```

### alloca 指令

+ 内存分配指令，在**栈**中分配一块空间并获得指向该空间的指针，类似于 C/C++ 中的 malloc 函数

```assembly
<result> = alloca <type> [, <type> <NumElements>] [, align <alignment>]; 分配sizeof(type)*NumElements 字节的内存，分配地址与 alignment 对齐
例：
%ptr = alloca i32; 分配 4 字节的内存并返回 i32 类型的指针
%ptr = alloca i32, i32 4; 分配 4*4 字节的内存并返回 i32 类型的指针
%ptr = alloca i32, i32 4, align 1024; 分配 4*4 字节的内存并返回 i32 类型的指针，分配的地址与 1024 对齐
%ptr = alloca i32, align 1024; 分配 4 字节的内存并返回 i32 类型的指针，分配的地址与 1024 对齐
```

### store 指令

+ 内存存储指令，向指针指向的内存中存储数据，类似于 C/C++ 中的指针解引用后的赋值操作

```assembly
store <type> <value>, <type>* <pointer>; 向特定类型指针指向的内存存储相同类型的数据
例：
%ptr = alloca i32			; yields i32*:ptr
store i32 3, i32* %ptr		; yields void
```

### load 指令

+ 内存读取指令，从指针指向的内存中读取数据，类似于 C/C++ 中的指针解引用操作

```assembly
result = load <type>, <type>* <pointer>; 从特定类型指针指向的内存中读取特定类型的数据
例：
%ptr = alloca i32			; yields i32*:ptr
store i32 3, i32* %ptr		; yields void
%val = load i32, i32* %ptr	; yields i32:val = i32 3
```

## 类型转换操作 Conversion Operations

### trunc .. to 指令

+ u截断指令，将一种类型的变量截断为另一种类型的变量。对应 C/C++ 中大类型向小类型的强制转换（比如 long 强转 int）

```assembly
<result> = trunc <type1> <value> to <type2>		; 将 type1 类型的变量截断为 type2 类型的变量
例：
%X = trunc i32 257 to i8						; yields i8:1
%Y = trunc i32 123 to i1						; yields i1:true
%Z = trunc i32 122 to i1						; yields i1:false
%W = trunc i32 <2 x i16> <i16 8, i16 7> to <2 x i8>; yields <i8 8, i8 7>
```

### zext .. to 指令

+ 零拓展（Zero Extend）指令，将一种类型的变量拓展为另一种类型的变量，高位补0。对应 C/C++ 中小类型向大类型的强制转换（比如 int 强转 long）

```assembly
<result> = zext <type1> <value> to <type2>		; 将 type1 类型的变量拓展为 type2 类型的变量
例：
%X = zext i32 257 to i64						; yields i64:257
%Y = zext i1 true to i32						; yields i32:1
%Z = zext <2 x i16> <i16 8, i16 7> to <2 x i32>	; yields <i32 8, i32 7>
```

### sext .. to 指令

+ 符号位拓展（Sign Extend）指令，通过复制符号位（最高位）将一种类型的变量拓展为另一种类型的变量

```assembly
<result> = sext <type1> <value> to <type2>		; 将 type1 类型的变量拓展为 type2 类型的变量
例：
%X = sext i8 -1 to i16							; yields i16:-1
%Y = sext i1 true to i32						; yields i32:-1
%Z = sext <2 x i16> <i16 8, i16 7> to <2 x i32>	; yields <i32 8, i32 7>
```

## 其他操作 Other Operations

### phi 指令

由静态单赋值引起的问题：在最后一个基本块中，我们怎么知道应该使用 y1 变量还是y2 变量呢？

![image-20230207034927020](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230207034927020.png)

u通过引入 Φ 函数来解决这个问题，Φ 函数的值由前驱块决定，这里的 Φ 函数对应 LLVM IR 中的 phi 指令：

![image-20230207041246011](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230207041246011.png)

+ phi 指令可以看做是为了解决 SSA 一个变量只能被赋值一次而引起的问题衍生出的指令
+ phi 指令的计算结果由 phi 指令所在的基本块的 **前驱块** 确定

```assembly
<result> = phi <type> [ <val0>, <label0>], ... ; 如果前驱块为 label0，则 result=val0 ...
例：实现 for 循环
Loop:	; Infinite loop that counts from 0 on up...
	%indvar = phi i32 [ 0, %LoopHeader ], [ %nextindvar, %Loop ]
	%nextindvar = add i32 %indvar, 1
	br label %Loop
```

### select 指令

+ select 指令类似于 C/C++ 中的**三元运算符**”... ? ... : ...”

```assembly
<result> = select i1 <cond>, <type> <val1>, <type> <val2>;	如果条件 cond 成立，result=val1，否则 result=val2
例：
%X = select i1 true, i8 17, i8 42 ; yields i8:17
```

### call 指令

+ call 指令用来调用某个函数，对应 C/C++ 中的函数调用，与x86汇编中的 call 指令类似

```assembly
<result> = call <type>|<fntype> <fnptrval>(<function args>) ;调用函数
例：
%retval = call i32 @test(i32 %argc) ; 调用 test 函数，参数为 i32 类型，返回值为 i32 类型
call i32 (i8*, ...)* @printf(i8* %msg, i32 12, i8 42); 调用 printf 函数，参数可变
```
