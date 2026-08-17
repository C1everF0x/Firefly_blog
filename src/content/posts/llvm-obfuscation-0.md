---
title: "llvm代码混淆学习（零）"
published: 2022-12-07
description: "随便学学，顺便做个毕设"
tags: ["代码混淆"]
category: "llvm代码混淆"
image: api
---

> 写在前面
>
> 随便学学 llvm 代码混淆，顺便做个毕设，水几篇文章就当做做笔记

# LLVM 简介

一个包含了很多模块的编译器框架，因为其 LLVM Pass 框架的特殊性，能够干预中间代码的优化过程，跟代码混淆技术契合度很高，所以 LLVM 编译器常被用来研究代码混淆。

## LLVM 编译过程

前端：Clang

前端对高级语言源代码进行词法分析、语法分析和语义分析，最后产生中间代码 LLVM IR。

优化器，后端：LLVM Core

优化器对中间代码 LLVM IR 进行优化，并且能够加载 LLVM Pass 执行用户自定义的优化（本研究用于代码混淆）。

后端则根据优化后的代码生成目标平台的机器代码。

## LLVM 目录结构

+ llvm/include/llvm：LLVM 提供的一些公共头文件
+ llvm/lib：LLVM大部分源代码和一些不公开的头文件
+ llvm/lib/Transforms：**所有 LLVM Pass 的源代码**和一些 LLVM 自带的 Pass

# LLVM 环境搭建

## 开发环境

+ Ubuntu 18.04
+ LLVM 12.01
+ Cmake 3.22.1

> 用 Ubuntu 18.04 编译 LLVM 12.01 时，cmake 版本指定为 3.13 以上，直接用 apt 安装的 cmake 是 3.10.2，所以需要自己下载高版本的 cmake。
>
> ![image-20230127104321293](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230127104321293.png)
>
> 步骤：
>
> ```linux
> wget https://cmake.org/files/v3.22/cmake-3.22.1.tar.gz
> tar -zxvf cmake-3.22.1.tar.gz
> mv cmake-3.22.1 /usr/local/bin/cmake
> cd /usr/local/bin/cmake
> ./bootstrap
> make
> sudo make install
> sudo ln -sf /usr/local/bin/cmake/bin/* /usr/bin/
> ```
>
> 问题：Could NOT find Open SSL
>
> ```
> sudo apt-get install libssl-dev
> ```
>
> 问题：Cmake error could not find CMAKE_ROOT 
>
> ``` 
> hash -r
> ```

## 第一步：下载 LLVM-Core 和 Clang 源代码

下载地址：[Release LLVM 12.0.1 · llvm/llvm-project · GitHub](https://github.com/llvm/llvm-project/releases/tag/llvmorg-12.0.1)

+ [clang-12.0.1.src.tar.xz](https://github.com/llvm/llvm-project/releases/download/llvmorg-12.0.1/clang-12.0.1.src.tar.xz)
+ [llvm-12.0.1.src.tar.xz](https://github.com/llvm/llvm-project/releases/download/llvmorg-12.0.1/llvm-12.0.1.src.tar.xz)

在 ```/home/llvm/Programs``` 文件夹内创建 ```llvm-project``` 文件夹，存放下载的源码压缩包。

将两个压缩包解压之后改名为 llvm 和 clang ，方便后续使用。 

在同一文件夹内创建名为 ```build``` 的文件夹，存放编译后的 LLVM。 此时的目录结构如下：

![image-20230127105808960](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230127105808960.png)

## 第二步：编译 LLVM 项目

在 llvm-project 目录下创建 ```build.sh```，写入下面内容。

```
cd build
cmake -G "Unix Makefiles" -DLLVM_ENABLE_PROJECTS="clang" \
-DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD="X86" \
-DBUILD_SHARED_LIBS=On ../llvm
make
make install
```

### cmake 参数解释：

+ -G "Unix Makefiles"：生成Unix下的Makefile 

+ -DLLVM_ENABLE_PROJECTS="clang"：除了 LLVM Core 外，还需要编译的子项目。 

+ -DLLVM_BUILD_TYPE=Release：在 cmake 里，有四种编译模式：Debug, Release,  RelWithDebInfo, 和MinSizeRel。使用 Release 模式编译会节省很多空间。 

+ -DLLVM_TARGETS_TO_BUILD="X86"：默认是 ALL，选择 X86 可节约很多编译时间。 

+ -DBUILD_SHARED_LIBS=On：指定动态链接 LLVM 的库，可以节省空间。 

+ make install 指令是将编译好的二进制文件和头文件等安装到本机的 /usr/local/bin 和 /usr/local/include 目录，方便后续使用。

执行 ```build.sh``` 文件自动安装和编译，编译时长从十多分钟到数小时，具体时间由机器性能决定。

> 执行 ```build.sh``` 文件必须要有管理员权限

输入 ```clang -v``` 确认编译和安装是否完成：

![image-20230127110132043](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230127110132043.png)

# LLVM Pass 简介

LLVM Pass 框架是整个 LLVM 提供给用户用来干预代码优化过程的框架，可以用来编写代码混淆工具，也可以用来写 fuzz、hook

编译后的 LLVM Pass 通过优化器 opt 进行加载，可以对 LLVM IR 中间代码进行**分析**和**修改**，生成新的中间代码

![image-20230203010751961](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230203010751961.png)

## 编译方式

第一种：和整个 LLVM 一起重新编译，Pass 代码需要放在 llvm/lib/Transforms 文件夹中，比较耗时

第二种：通过 Cmake 对 Pass 进行单独编译，方便快捷

第三种：使用命令行对 Pass 进行单独编译，项目越大越不好管理

## Pass 类型

设计新 LLVM Pass 时，最先需要决定的就是选择 Pass 的类型，包括：

+ ModulePass（基于模块）
+ FunctionPass（基于函数）
+ CallGraphPass（基于调动图）
+ LoopPass（基于循环）

毕设学习重点是 FunctionPass

+ FunctionPass 以函数为单位处理
+ FunctionPass 的子类必须实现 runOnFunction（Function &F）函数 
+ FunctionPass 运行时会对程序中每一个函数执行 runOnFunction 函数

## 简单编写

+ 创建一个类（class），继承 FunctionPass 父类
+ 在创建的类中实现 runOnFunction（Function &F）函数
+ 向 LLVM 注册 Pass 类

## 代码模板

```cpp
#include "llvm/Pass.h"
#include "llvm/IR/Function.h"
#include "llvm/Support/raw_ostream.h"

using namespace llvm;

namespace {
    
    class Demo : public FunctionPass{
		public:
			static char ID;
        	Demo() : FunctionPass(ID) {}
        
        	bool runOnFunction(Function &F);
    };

}

// runOnFunction 函数实现
bool Demo::runOnFunction(Function &F){
    // do something
}

char Demo::ID = 0;
// 注册该 Demo Pass
static RegisterPass<Demo> X("xxx", "Pass 描述.");
```

## 编译

+ 直接使用 Cmake 进行编译
+ 在 Build 文件夹内可以找到编译好的 so 文件

## 加载

使用优化器 opt 将处理中间代码，生成新的中间代码，例：

```
opt -load ./LLVMObfuscator.so -hlw -S hello.ll -o hello_opt.ll
```

+ `-load` 加载编译好的 LLVM Pass 进行优化

## Cmake 项目创建

### 目录结构

+ Build
+ Test
  + TestProgram.cpp
+ Transforms
  + include
  + src
    + HelloWorld.cpp
  + CMakeLists.txt
+ test.sh

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230203013038708.png)

### 目录介绍

Build：存放编译后的 LLVM Pass

Test：存放测试程序 TestProgram.cpp

TestProgram.cpp：待混淆文件，内容如下：

```cpp
#include <cstdio>
#include <cstring>

char input[100] = {0};
char enc[100] = "\x67\x75\x61\x72\x5b\x6a\x66\x93\x8c\x8a\x86\x89\x7f\x49\x8b\x7f\x93\x2e\x7f\x52\x63\x61\x6e\x67\x7f\x75\x7d\x21\x61\x9d";

void encrypt(unsigned char *dest, char *src){
    int len = strlen(src);
    for (int i = 0; i < len; i++)
    {
        dest[i] = (src[i] + (32 - i)) ^ i;
    }
}

//GUETCTF{llvm_1s_s0_4king_ea5y}
int main(){
    printf("Please input your flag: ");
    scanf("%s", input);
    unsigned char dest[100] = {0};
    encrypt(dest, input);
    bool result = strlen(input) == 30 && !memcmp(dest, enc, 30);
    if (result)
    {
        printf("Congratulations~\n");
    }else{
        printf("Sorry try again.\n");
    }
    
}
```

Transforms/include 文件夹：存放整个 LLVM Pass 项目的头文件

Transforms/src 文件夹：存放整个 LLVM Pass 项目的源代码

Transforms/src/HelloWorld.cpp：HelloWorld Pass 的源代码，一般一个 Pass 使用一个 cpp 文件实现即可

Transforms/CMakeLists.txt：整个 CMake 项目的配置文件，内容如下：

```cmake
# 参考官方文档：https://llvm.org/docs/CMake.html#developing-llvm-passes-out-ofsource
project(OLLVM++)# 整个项目名称
cmake_minimum_required(VERSION 3.13.4)# CMake 最低版本
find_package(LLVM REQUIRED CONFIG)

list(APPEND CMAKE_MODULE_PATH "${LLVM_CMAKE_DIR}")
include(AddLLVM)
include_directories("./include") # 包含 ./include 文件夹中的头文件

separate_arguments(LLVM_DEFINITIONS_LIST NATIVE_COMMAND ${LLVM_DEFINITIONS})
add_definitions(${LLVM_DEFINITIONS_LIST})
include_directories(${LLVM_INCLUDE_DIRS})

add_llvm_library( LLVMObfuscator MODULE
  src/HelloWorld.cpp
)# 向 LLVM 注册 LLVMObfuscator 模块，每个模块对应一个 so 文件，包含 src/HelloWorld.cpp 源代码
```

test.sh：编译 LLVM Pass 并对 Test 文件夹中的代码进行测试，内容如下：

```shell
cd ./Build
cmake ../Transforms
make
cd ../Test
clang TestProgram.cpp -emit-llvm -fno-discard-value-names -S -c -o TestProgram.ll
opt -load ../Build/LLVMObfuscator.so -hlw -S TestProgram.ll -o TestProgramhlw.ll
clang TestProgramhlw.ll -o TestProgramhlw
./TestProgramhlw
```

> 加上`-fno-discard-value-names`选项是为了在生成文本 IR 时部分变量的分配保留源代码中的命名方式，使得其更易于阅读。
>
> 如果不加的话，变量名就全是数字，难以阅读

不加参数：

![image-20230219210210151](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230219210210151.png)

加上参数后：

![image-20230219210256108](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/image-20230219210256108.png)
