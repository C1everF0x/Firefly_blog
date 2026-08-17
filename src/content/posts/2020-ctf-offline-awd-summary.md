---
title: "2020西大线下赛总结"
published: 2020-10-27
tags: ["CTF"]
category: "人生总结"
image: api
---

> 写在前面
> 这是第一次打线下 AWD 的 CTF 比赛，但是感觉赛制不够正宗，居然是解题和打靶机两个模块分开来的，之前一直以为是把题目放到靶机上

这次比赛我的队伍没有取得很好的名次，我觉得原因还是在我，第一是硬实力不够强，第二是心态不够沉稳，第三是忽略了团队的作用

复现 Web 题

## 1、hash

右键查看源码发现 waf

```php
<?php
$flag='flag{*********************}';
if(isset($_GET['username']) && isset($_GET['password'])){
    if ($_GET['username']==$_GET['password']){
        echo('密码不能与账户相同');
    }
    else{
        if(sha1($_GET['username'])==sha1($_GET['password'])){
            if(md5(implode('',$_GET['username']))===md5(implode('',$_GET['password']))){
                die($flag);
            }
            else{
                echo('账户与密码md5值不相等');
            }
        else{
            echo('账户与密码sha1值不相等 :(');
        }
}
```

很常规的题型了

sha1函数用数组绕过，当传入的是数组时，sha1函数解析错误返回 False 完成 if 条件比较username[]=xxx,password[]=xxx

md5 函数强比较是 md5 值碰撞绕过，如果是常规强比较可以用数组绕过，传进去两个数组，数组的值不相等，造成 md5 加密时报错产生 NULL=NULL 的情况，绕过比较，但是**implode函数是把数组元素组合为字符串**，不能用数组绕过

payload:

```
username[]=%4d%c9%68%ff%0e%e3%5c%20%95%72%d4%77%7b%72%15%87%d3%6f%a7%b2%1b%dc%56%b7%4a%3d%c0%78%3e%7b%95%18%af%bf%a2%00%a8%28%4b%f3%6e%8e%4b%55%b3%5f%42%75%93%d8%49%67%6d%a0%d1%55%5d%83%60%fb%5f%07%fe%a2
&
password[]=%4d%c9%68%ff%0e%e3%5c%20%95%72%d4%77%7b%72%15%87%d3%6f%a7%b2%1b%dc%56%b7%4a%3d%c0%78%3e%7b%95%18%af%bf%a2%02%a8%28%4b%f3%6e%8e%4b%55%b3%5f%42%75%93%d8%49%67%6d%a0%d1%d5%5d%83%60%fb%5f%07%fe%a2
```

![flag](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201024221100.png)

## 2、dHd

> 这题就是让我比赛没有取得更好成绩的原因

```php
<?php
$file = @base64_decode(file_get_contents($_GET['file'],'r'));
$gogogo = @unserialize($file);
class flag{
	private $file = 'index.php';
	public function __construct($file){
           $this->file = $file;
        }
    function __wakeup(){
           $this->file = 'index.php';
        }    
    function __destruct(){
           echo file_get_contents(str_ireplace(['fl@g','/','\\'],'',$this->file));
        }
}
```

常规得不能再常规的一道反序列化题，20 分钟审完代码

> `file_get_contents() `：把整个文件读入一个字符串中，

> `str_ireplace() `:替换字符串中的一些字符，例如：`str_ireplace("WORLD","Peter","Hello world!");`把字符串 "Hello world!" 中的字符 "WORLD"（不区分大小写）替换成 "Peter"：

GET方式 传进去一个 $file ，`file_get_contents`函数把文件读取成字符串，所以 $file 应该是一个文件，结合题目和后面的过滤，猜测是`fl@g.php`，`base64_decode`解密，把字符串反序列化

进入 class 类，反序列化的时候`__wakeup()`魔术方法会自动运行，会把 $file 的名字改为 `index.php`，所以这题第一个考点就是绕过`__wakeup()`函数，方法很简单，这个函数有它自己的漏洞，第二个考点在对象实例化后销毁的时候，会自动调用类里面的`__destruct`函数，过滤掉`fl@g`字段，绕过这个函数的方法也很简单，双写绕过，`flfl@g@g.php`，str_ireplace函数把`fl@g`替换成空后留下来的还是`fl@g.php`

最后需要用 `php://input`伪协议

>对于`php://input`介绍
>
>PHP官方手册文档有一段话对它进行了很明确地概述。
>==“php://input allows you  to read raw POST data. It is a less memory intensive alternative  to$HTTP_RAW_POST_DATA and does not need any special php.ini directives.  php://input is not available with enctype=”multipart/form-data”.==
>
>翻译过来，是这样：
>==“php://input可以读取没有处理过的POST数据。相较于$HTTP_RAW_POST_DATA而言，它给内存带来的压力较小，并且不需要特殊的php.ini设置。php://input不能用于enctype=multipart/form-data”==
>
>> 这里是自己的理解
>>
>> `file_get_contents`函数本质上是得到一个文件路径然后去访问一个地址，然后取出其中的内容返回成一个字符串，而 `php://input`伪协议访问文件的只读流能够定位到 POST 表单，同样也是返回一个地址，所以能够让`file_get_contents`直接读到 POST 表单的数据当成返回值

## 3、inj

刚开始进来看到题目，信息还是挺多的

![初见](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201016234902.png)

```
/flag.txt
flag in /fllllllllllllag		
file?filename=/flag.txt&filehash=949e1b3d04ef60ff02ffc6f6bb34fdae
```

```
/welcome.txt
render
file?filename=/welcome.txt&filehash=f123ac29baec2ab4ba71527c69fb5e27
```

```
/hints.txt
md5(cookie_secret+md5(filename))
file?filename=/hints.txt&filehash=25e57d65d8b56f0088974e199fafd121
```

依次点开发现得到以下内容，通过观察发现`file?filename=/文件名&文件的md5值`，其中 hints.txt 里面提示`md5(cookie_secret+md5(filename))`，welcome.txt 里面提示一个`render`是渲染的意思，flag.txt 里面是通知一声 flag 在`fllllllllllllag`里面，这个题的题目里`tornado`是 Python 的一个模板

当有文件名或文件md5值不匹配时，将会跳转到 Error 页面

![Error](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201016235931.png)

> 这题是SSTI服务器模板注入

因此，通过`handler.application`即可访问整个tornado。简单而言通过`{{handler.application.settings}}`或者`{{handler.settings}}`就可获得`settings`中的**`cookie_secret`**

![cookie_secert](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201016234807.png)

找个 md5 加密网站搞一搞就出来了

![flag](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201017003214.png)



# 流水账

## 10.23

23号没啥好说的，在学校打车去火车站半天打不到，差点急死人，十二点的车，到南宁后坐地铁，然后走路到酒店以及天黑了，然后姚老师请大家吃了饭，真好

吃完饭偷偷拿了比赛牌去找了在西大的高中同桌玩

![](https://aimerl0-1303178350.cos.ap-guangzhou.myqcloud.com/20201027201147.png)

俩人逛了西大好大一圈，我发现桂电和西大都挺大的，但是就是感觉桂电小小气气的，后来和队友总结了一下，发现西大的建筑、楼，普遍高大宏伟有排面，桂电的楼吧，我姑且说是咱学校低调吧

![西大有排面的楼](https://s1.ax1x.com/2020/10/27/BlEp6A.jpg)



西大自产自销的牛奶特别好喝，就是感觉一瓶有点少，几口就闷没了，但是真的特别好喝

好兄弟还带我去逛了他在的那个学院，参观的时候发生了好玩的事情，在《包装设计师必读手册》旁边有一杯喝完的益禾堂，这一版墙都是展示荣耀、奖状和出版作品的，我差点以为这个益禾堂的包装也是个荣誉作品，出自西大之手

![注意细节](https://s1.ax1x.com/2020/10/27/BlA6Lq.jpg)

逛的差不多了，跟好兄弟交代了一点事之后就回到酒店呼呼大睡了

## 10.24

比赛的日子，我这个学期第一次早上六点半起床，真不错，早起真不错

大家收拾好集合了以后就跑去西大吃早点了，就普普通通吃了一碗桂林米粉，虽然味道不错但还是没有桂林的感觉，学长说是酸笋不够臭

接下来就到了比赛的现场，荟萃楼7楼，这楼是真的漂亮，礼仪小姐姐估计是西大的礼仪队的，也很漂亮

![丢人现场](https://s1.ax1x.com/2020/10/27/BlE2jA.jpg)

说到比赛场地，我真的对比赛坐的那个椅子非常满意，虽然其貌不扬，但是真的特别特别舒服，后背靠的那个地方是可以调节的，做很久了腰和脖子都不会很累

![很舒服的椅子](https://s1.ax1x.com/2020/10/27/BlVUPS.jpg)

比赛内容分成了两个模块，一个是 ctf 常规解题，另一边是打靶机，但是每个队基本上都在做题，一个上午过去了，大家都说这靶机是虚空靶机，找都找不到在哪，只能吃吃彩蛋和线索的烂分，说到题，比赛居然没有 pwn 题，搞得 pwn 师傅十分不满意，差点当场退役，只能打打逆向玩一玩

打到中午，西大给大家准备了盒饭，就很常规的食堂饭，还行，跟桂电的差不了多少，吃完饭就继续打比赛了

打完比赛以后，姚老师带我们和以前毕业的学长一起吃了个饭，然后学长给我们说了好多好多话，虽然可能是喝多了，但是说的话无非绕不开`努力`、`带学弟`和`传承`三个关键字，信息安全发展至今毕竟还是小圈子，之所以有那么多内推的名额，最大的原因还是传承，每个学校都有信息安全的社团，社团内的一脉相传，不管是技术上还是精神上，都是一种传承，在良好的氛围下，还需要每个人都不断的努力，从早到晚，从周一到周日，从学期开始到学期结束，从大一到大四......所以以后得更加努力，努力提升自己

吃完饭回到酒店洗了个澡，跟舍友去逛了逛周边的夜市散了散步，买了杯果茶就散步回到酒店继续呼呼大睡了

## 10.25

归家的日子，睡不惯酒店的被子，导致我因为踢被子早上五六点就醒了，再一觉醒来九点半，觉得来南宁没有吃个老友粉还是对不起这张车票的，然后一起去吃了个老友粉，味道还行，下次来找朋友推荐几家正宗的去试一试

![老友粉](https://s1.ax1x.com/2020/10/27/Blnaoq.jpg)



坐地铁去火车站，回桂电，洗衣服，睡一觉，起来干活(补作业)

这天最倒霉的就是到了桂林北站，学长说搞个共享汽车开回去，结果共享汽车刚开出停车位没几步就没电打不起火了，然后又滴滴打车回到了学校，还比自己开车便宜
