---
title: "llvm代码混淆学习（四）"
published: 2023-02-13
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

> 写在前面
>
> 随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# 代码混淆基本原理

## 术语介绍

### 代码混淆

代码混淆是将计算机程序的代码，转换成一种功能上等价，但是难以阅读和理解的形式的行为。

![image-20230213153958210](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213153958210.png)

### 函数

函数是代码混淆的基本单位，一个函数由若干个基本块组成，有且仅有一个入口块，可能有多个出口块。

一个函数可以用一个控制流图（Control Flow Graph，CFG）来表示。

### 基本块

基本块由一组线性指令组成，每一个基本块都有一个入口点（第一条执行的命令）和一个出口点（最后一条执行的指令，也即终结指令）。

终结指令要么跳转到另一个基本块（br，switch），要么从函数返回（ret）。

### 控制流

控制流代表了一个程序在执行过程中可能遍历到的所有路径。

通常情况下，程序的控制流很清晰的反映了程序的逻辑，但经过混淆的控制流会使得人们难以分辨正常逻辑。

![image-20230213212740892](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213212740892.png)

### 不透明谓词

不透明谓词指的是其值为混淆者明确知晓，但是反混淆者却难以推断的变量。

例如混淆者在程序中使用一个恒为 0 的全局变量，反混淆者难以推断这个变量恒为 0。

![image-20230213212900831](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213212900831.png)

## 常见的混淆思路

### 符号混淆

将函数的符号，如函数名、全局变量名去除或者混淆。对于 ELF 文件可以通过 strip 指令去除符号表完成。

![image-20230213213027766](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213213027766.png)

### 控制流混淆

控制流混淆指的是混淆程序的正常的控制流，使其在功能保持不变的情况下不能清晰的反映原本程序的正常逻辑。

经典的控制流混淆有：控制流平坦化、虚假控制流、随机控制流。

![image-20230213213132828](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213213132828.png)

### 计算混淆

计算混淆指的是混淆程序的计算流程，或计算流程中使用的数据，使分析者难以分辨某一段代码所执行的具体计算。

经典的计算混淆有：指令替代、常量替代。

![image-20230213213235744](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213213235744.png)

### 虚拟机混淆

虚拟机混淆的思想是将一组指令集合（如一组 x86 指令），转化为一组攻击者未知的自定义指令集。并用与程序绑定的解释器解释执行。

经典虚拟机混淆：VMProtect

虚拟机混淆是目前最强力的混淆，但也有许多缺点：如性能损耗大、容易被杀毒软件报毒等。

![image-20230213213412543](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230213213412543.png)

# OLLVM 使用

Obfuscator-LLVM（简称OLLVM）是2010年6月由瑞士西部应用科学大学(HEIG-VD)的信息安全小组发 起的一个项目。 这个项目的目的是提供一个 LLVM 编译套件的开源分支，能够通过代码混淆和防篡改提 供更高的软件安全性。

OLLVM 提供了三种经典的代码混淆：

+ 控制流平坦化 Control Flow Flattening
+ 虚假控制流 Bogus Control Flow
+ 指令替代 Instruction Subsititution

## Ubuntu/OLLVM/Docker 版本

+ Ubuntu 16.04
+ OLLVM 4.0
+ Docker 20.10.7

## 安装

第一步：安装 docker

[参考教程 点击直达](https://blog.csdn.net/qq_42376617/article/details/126389108)

第二步：pull docker 容器

```shell
docker pull nickdiego/ollvm-build
```

![image-20230215124300406](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215124300406.png)

第三步：下载安装脚本和 OLLVM 源代码

```shell
git clone https://github.com/nickdiego/docker-ollvm.git
git clone -b llvm-4.0 https://github.com/obfuscator-llvm/obfuscator.git
```

![image-20230215124323394](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215124323394.png)

第四步：在 docker 容器上编译 OLLVM

在 `ollvm-build.sh` 的第 150 行加入：

```sh
DOCKER_COM+=" -DLLVM_INCLUDE_TESTS=OFF"
```

关闭 llvm 的头文件测试，为了加快编译速度

![image-20230215124400504](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215124400504.png)

执行`ollvm-build.sh`：

```shel
chmod 777 ollvm-build.sh
sudo ./ollvm-build.sh ../obfuscator
```

![image-20230215141045340](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215141045340.png)

编译了快俩小时，编译完成后在`obfuscator/build_release`目录执行指令创建软链接：

```shell
sudo ln ./bin/* /usr/bin/
```

输入`clang --version`指令确定安装是否完成：

![image-20230215141138975](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215141138975.png)

## 测试文件 ida 分析

清晰明了：

![image-20230215151112343](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151112343.png)

流程简单：

![image-20230215151136939](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151136939.png)

## 控制流平坦化 Control Flow Flattening

可用选项：

+ `-mllvm -fla`：激活控制流平坦化
+ `-mllvm -split`：激活基本块分割
+ `-mllvm -split_num=3`：指定基本块分割的数目，这里指定一个基本块会被分割成三个基本块后再进行控制流平坦化混淆

例：

```shell
clang -mllvm -fla -mllvm -split -mllvm -split_num=3 TestProgram.cpp -o TestProgram_fla
```

在编译时可能出现`stddef.h`和`stdarg.h`两个头文件不存在的错误，可以使用`locate stddef.h`和`locate stdarg.h`指令找到这两个头文件的位置，然后复制到`/usr/include`或`usr/local/include`目录下

> 使用` locate` 命令可以看到很多目录下都有`stddef.h`和`stdarg.h`这两个头文件，但是这两个头文件只能是复制`/usr/lib/gcc/x86_64-linux-gnu/5/include`这个目录下的，其他目录下的复制过去编译会报错

![image-20230215150703288](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215150703288.png)

编译得到文件，拖去 ida 看，熟悉的一坨

![image-20230215150919567](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215150919567.png)

![image-20230215151344546](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151344546.png)

## 虚假控制流 Bogus Control Flow

可用选项：

+ `-mllvm -bcf`：激活虚假控制流
+ `-mllvm -bcf_loop=3`：混淆次数，这里指定一个函数会被混淆三次，默认一次
+ `-mllvm -bcf_prob=40`：每个基本块被混淆的概率，这里每个基本块被混淆的概率为40%，默认为30%

例：

```shell
clang -mllvm -bcf -mllvm -bcf_loop=3 -mllvm -bcf_prob=40 TestProgram.cpp -o TestProgram_bcf
```

巨长一条：

![image-20230215151513361](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151513361.png)

熟悉的表达式：

![image-20230215151554912](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151554912.png)

## 指令替代 Instruction Subsititution

可用选项：

+ `-mllvm-sub`：激活指令替代
+ `-mllvm -sub_loop=3`：混淆次数，这里指定一个函数会被混淆三次，默认一次

例：

```shell
clang -mllvm -sub -mllvm -sub_loop=3 TestProgram.cpp -o TestProgram_sub
```

![image-20230215151730797](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151730797.png)

在计算表达式多的函数，如加密函数里，混淆的效果比较好：

![image-20230215151755654](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230215151755654.png)
