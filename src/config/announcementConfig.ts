import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "📢 欢迎来访者",

	// 公告内容
	content:
		"👋🏻你好，这里是C1everF0x的博客，记录了些自己的生活感悟和网络安全技术相关学习笔记，欢迎交流也希望你能在这里找到你爱康的内容！",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "了解更多",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
