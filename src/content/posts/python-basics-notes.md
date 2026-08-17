---
title: "Python基础学习笔记"
published: 2020-09-17
tags: ["Python"]
category: "学习笔记"
image: api
---

# Python3学习笔记

>**写在前面**
>
>**最近打CTF已经遇到瓶颈了，简单的、考点比较单一的题能打，但是比赛现在的web题都是综合性比较好的，自己写脚本的水平也是不太行，所以准备打一下Python的基础，之后开始复现那些高水平的web题**

## 简介

+ 解释型语言：开发过程没有编译环节，类似的有PHP、Perl
+ 交互式语言：在命令行、终端中，可以在一个Python提示符`>>>`后直接执行代码
+ 面向对象语言：Python支持面向对象的风格或代码封装在对象的编程技术

## 开发环境

> 选择的集成开发环境：**PyCharm**

## 基础语法

### 标识符

+ 第一个字符必须是字母表中的字母或者下划线`_`
+ 其他部分可以是字母、数字、下划线、中文
+ 标识符对大小写敏感

### 保留字

```python
标准库里面有一个keyword模块，可以查看当前版本所有关键字
>>> import keyword
>>> keyword.kwlist
['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']
# Python3.7
```

### 注释

```Python
# Python中单行注释以#开头
# 第一个注释
print ("Hello, Python!") # 第二个注释
```

### 行与缩进

```Python
# Python以缩进来表示代码块，不用{},同一个代码块的语句必须包含相同的缩进空格数
if True:
	print ("True")
else:
    print ("False")
# Python一般是一行写完一条语句，可以用反斜杠\来实现多行语句
total = item_one + \
		item_two + \
    	item_three
# 在[]、{}、()的多行语句中，不用反斜杠\
total = ['item_one', 'item_two', 'item_three',
        'item_four', 'item_five']
```

### 数字类型

有整数、布尔、浮点数和复数

+ `int`：如1，**只有长整型**
+ `bool`：True或者False
+ `float`：1.23、3E-2
+ `complex`：1+2j、1.1+2.2j

### 字符串

+ 单引号和双引号一样
+ 转义字符`\`
+ 字符串可以用`+`连接，用`*`重复
+ Python中的字符串不能改变，且没有单独的字符说法，一个字符就是一个长度为 1 的字符串

+ 字符串截取语法：==变量[头下标:尾下标:步长]==

+ Python的字符串是左包含的，从左往右以 0 开始，从右往左以 -1 开始

  ```python
  str = 'C1everF0x'
  print(str)
  # 结果是 C1everF0x
  print(str[2:5])
  # 结果是 eve	
  print(str[0:-1])
  # 结果是 C1everF0
  ```

### 空行

+ 函数之间、类的方法之间用空行分隔，表示一段新的代码开始，方便以后代码的维护和重构

### print

+ `print`输出默认换行，不换行要在变量末尾加上 `end=“ ”`

### import和from...import

+ 用于导入相应模块

``` python
import somemodule	# 导入整个模块，引用时格式为：somemodudle.somefunction()
from somemodule import somefunction	# 从某个模块中导入一些函数，引用时格式为：somefunction()
from somemodule import *	# 导入某个模块全部函数，引用时格式为：somefunction()
import somemodule as abc	# 作用是自定义模块名字，在引用时格式为：abc.somefunction()
```

### 数据类型

> **其实这六个数据类型，其实都是Python定义的内建类，每一个变量（对象）其实就是类的实例化**
>
> **即，所有的字符串都是`str`类的实例，所有的列表都是`list`类的实例**

| 不可变        | 可变        |
| ------------- | ----------- |
| Number        | List        |
| String        | Dictionary  |
| Tuple（元组） | Set（集合） |

#### Number

+ `int` `float` `bool` `complex` 四种类型，其中`int`只有长整型

+ 加减乘除正常用，`/`返回浮点数，`//`返回整数

+ 数字类型值不可变的原因就是，只要两个变量的值相同，那么他们的==ID(地址)==就是相同的

  ```python
  >>> b = 5  
  >>> a = 5  
  >>> id(a)  
  162334512  
  >>> id(b)  
  162334512  
  >>> a is b  
  True
  ```

#### String（上面字符串）

#### Tuple（元组）

+ 用`()`表示，比如`('abcd', 786, 2.23, 'C1everF0x', 70.2)`就是一个元组

+ 截取、索引和切片方法和字符串一样

+ 构造包含 0 个或 1 个元素的元组语法规则比较特殊

  ```python
  tup1 = ()	# 空元组
  tup2 = (20,)	# 含一个元素的，需要在元素后面添加逗号
  ```

#### List（列表）

+ 用`[]`表示，比如`[ 'abcd', 786 , 2.23, 'C1everF0x', 70.2 ]`就是一个列表
+ 截取、索引和切片方法和字符串一样

#### Set（集合）

+ 用`{}`或者`set()`创建集合，空集必须用`set()`，因为`{}`是用来创建空字典

#### 字典

+ 字典包含在`{}`中，每个键值`key=>value` 对用冒号`:` 分割，每个对之间用逗号分割

+ 键必须是唯一的，值不是唯一的
+ 键的数据类型只能是字符串或数字，值可以是任何数据类型

### 基础语法

+ 跟C语言差不多，不记上来了

### 函数

+ 自定义函数以`def`开头，接函数名，接`(参数列表)`，接`:`

+ `return [表达式]`表示结束函数，返回一个东西，如果没有则是返回`None`

  ```python
	def 函数名 (参数列表):
	函数代码
	```
>学到这里的时候发现有一个概念
>
>Python里面变量是没有类型的，类型是属于对象，其中就有**可更改对象**和**不可更改对象**
>
>+ 不可变对象：数字、字符串、元组
>+ 可变对象：列表、集合、字典
>
>**本质区别**
>
>当给不可变对象重新传值的时候，不是修改了变量的值，而是重新生成了一个新的对象，然后再让变量指向新的内存地址，==其内存地址发生了改变==
>
>当给可变对象重新传值的时候，是真正修改了对象的值，没有重新生成一个新的对象，变量前后指向的是同一个内存地址，==其内存地址没有发生改变==

#### 参数

##### 必须参数

+ 顺序要对，调用数量要对，数据类型也要对

##### 关键字参数

+ 在调用时，允许参数顺序和函数声明的时候不一样，解释器能够自动匹配

  ```python
  def printsomething( name, age ):
  # 打印任何传入的字符串
     print ("名字: ", name)
     print ("年龄: ", age)
     return
   
  #调用printsomething函数
  printsomething( age=19, name="C1everF0x" )
  
  # 结果
  # 名字:  C1everF0x
  # 年龄:  19
  ```

##### 默认参数

+ 使用函数传参的时候没有传具体值进去，就会使用默认值，即函数声明时参数列表里面已经设置好的那个值

+ 默认参数必须放在最后，不然报错

  ```python
  def printsomething( age, id = C1everF0x ):
  # 打印函数，年龄和id
  	print ("年龄：", age)
  	print ("id：", id)
  	return
  
  # 调用printsomething函数
  printsomething( age=19, id="Oui0jr")
  # 结果是：
  # 年龄：19
  # id：Oui0jr
  printsomething( age=19, id)
  # 结果是：
  # 年龄：19
  # id：C1everF0x
  ```

##### 不定长参数

+ 当你不知道你要传多少、传什么类型的参数进去的时候可以采用，以存放所有未命名的参数

+ 加了星号`*`的参数是以元组形式导入

  语法为：def 函数名([常规参数], *vartuple):

  ```python
  def printsomething( id=C1everF0x, *vartuple ):
  # 打印函数，id、年龄和水平
  	print ("输出：")
  	print (id)
  	print (vartuple)
      
  # 调用printsomething函数
  printsomething( id, 19, "弟弟")
  # 结果是
  # 输出：
  # C1everF0x
  # (19,"弟弟")
  ```

+ 加了两个星号`**`的参数是以字典形式导入

  语法为：def 函数名([常规参数], **vartuple):

  ```python
  def printsomething( id, **vardict ):
  # 打印任何传入的参数
     print ("输出: ")
     print (id)
     print (vardict)
   
  # 调用printsomething函数
  printinfo(C1everF0x, age=19,lever="弟弟")
  # 结果是：
  # 输出: 
  # C1everF0x
  # {'age': 19, 'level': "弟弟"}
  ```

+ 单独一个星号`*`不带参数，调用时必须传==关键字==进去

  语法为：def 函数名([常规参数], *):

  ```python
  def f(a,b,*,c):
  	return a+b+c
  f(1,2,3)   # 报错
  f(1,2,c=3) # 正常
  # 结果为6
  ```

### 匿名函数

+ 用`lambda`来创建匿名函数

+ 创建出来的函数只是一个表达式，且不能访问自己参数列表以外的或全局命名空间里面的参数

  ```python
  lambda 参数1,参数2,...参数N:表达式
  ```

### 模块

+ 是一个包含了所有自定义的函数和变量的文件，后缀名是`.py`，可以被别的程序引入来使用其中的函数
+ `dir()`函数可以看到模块内定义的所有名称

## 面向对象

> **~~企业级理解~~：**
>
> **面向对象就是让每一个类都只做一件事，面向过程就是让一个类越来越全能，一个人做完全部的事情**
>
> 
>
> **摇(狗尾巴)——面向过程编程**
>
> **狗.摇尾巴()——面向对象编程**
>
> 
>
> **找一个会做家务的男朋友，再找一个月薪20k的男朋友，再找一个会做饭的男朋友，最后找一个老实不花心的男朋友，不要让他们四个人同时见面——面向对象编程**
>
> **找一个会做家务、月薪20k、会做饭、老实不花心的老公——面向过程编程**

```python
# 语法
class ClassName:
    方法1:
        xxxxxx
    方法2:
        xxxxxx
    属性1
    属性2
```

+ 类的对象可以引用类的属性和方法
+ 类的方法与普通的函数只有一个特别的区别——必须有一个额外的**第一个参数名称**, 按照惯例它的名称是`self`，也可以是其他的名字

### 类的方法

#### 一般方法

在类的内部，用`def`定义方法，类的方法必须包含参数`self`而且必须是第一个参数，`self`表示的是类的实例（对象）

#### 静态方法

用`@staticmethod`装饰不带`self`参数的方法，可以没有参数，可以直接用类名来调用

#### 类方法

用`@classmethod`装饰，默认有一个`cls`参数，可以被类和对象调用

#### 专有方法

- `__init__` 构造函数，在生成对象时调用
- `__del__` 析构函数，释放对象时使用
- `__repr__` 打印，转换
- `__str__`输出字符串
- `__setitem__`按照索引赋值
- `__getitem__`按照索引获取值
- `__len__`获得长度
- `__cmp__`比较运算
- `__call__`函数调用
- `__add__`加运算
- `__sub__`减运算
- `__mul__`乘运算
- `__truediv__`除运算
- `__mod__`求余运算
- `__pow__`乘方

> **Python 3.7版本**

### 类的属性

#### 公有属性（在类的外部可以直接访问）

跟定义变量一样

`a = 0`

#### 私有属性（在类的外部不可以直接访问）

变量名字前面加俩下划线

`__a = 0`

### 继承

#### 单继承

```python
# 语法
class sonClassName(fatherClassName):
```

+ 直接贴段代码例子

```python
#类定义
class people:
    #定义基本属性
    name = ''
    age = 0
    #定义私有属性,私有属性在类外部无法直接进行访问
    __weight = 0
    #定义构造方法
    def __init__(self,n,a,w):
        self.name = n
        self.age = a
        self.__weight = w
    def speak(self):
        print("%s 说: 我 %d 岁。" %(self.name,self.age))
 
#单继承示例
class student(people):
    grade = ''
    def __init__(self,n,a,w,g):
        #调用父类的构函
        people.__init__(self,n,a,w)
        self.grade = g
    #覆写父类的方法
    def speak(self):
        print("%s 说: 我 %d 岁了，我在读 %d 年级"%(self.name,self.age,self.grade))
 
s = student('C1everF0x',10,60,3)
s.speak()
# 结果是：C1everF0x 说: 我 10 岁了，我在读 3 年级
```

#### 多继承

```python
# 语法
class sonClassName(father1ClassName,father2ClassName)
```

+ 直接贴段代码例子

```python
#类定义
class people:
    #定义基本属性
    name = ''
    age = 0
    #定义私有属性,私有属性在类外部无法直接进行访问
    __weight = 0
    #定义构造方法
    def __init__(self,n,a,w):
        self.name = n
        self.age = a
        self.__weight = w
    def speak(self):
        print("%s 说: 我 %d 岁。" %(self.name,self.age))
 
#单继承示例
class student(people):
    grade = ''
    def __init__(self,n,a,w,g):
        #调用父类的构函
        people.__init__(self,n,a,w)
        self.grade = g
    #覆写父类的方法
    def speak(self):
        print("%s 说: 我 %d 岁了，我在读 %d 年级"%(self.name,self.age,self.grade))
 
#另一个类，多重继承之前的准备
class speaker():
    topic = ''
    name = ''
    def __init__(self,n,t):
        self.name = n
        self.topic = t
    def speak(self):
        print("我叫 %s，我是一个演说家，我演讲的主题是 %s"%(self.name,self.topic))
 
#多重继承
class sample(speaker,student):
    a =''
    def __init__(self,n,a,w,g,t):
        student.__init__(self,n,a,w,g)
        speaker.__init__(self,n,t)
 
test = sample("C1everF0x",25,80,4,"Python")
test.speak()   #方法名同，默认调用的是在括号中排前的父类的方法
# 结果是：我叫 C1everF0x，我是一个演说家，我演讲的主题是 Python
```

#### 重写父类方法

+ 可以在子类里面重写父类的方法，方法名一样
+ 要调用父类被覆盖的方法的时候可以使用`super()`函数
