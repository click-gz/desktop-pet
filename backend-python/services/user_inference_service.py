"""
用户属性推测服务
基于聊天内容推测用户的年龄、性别、职业等属性
"""

import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime


class UserInferenceService:
    """用户属性推测服务"""
    
    def __init__(self):
        # 职业关键词库
        self.occupation_keywords = {
            "程序员": ["编程", "代码", "bug", "调试", "开发", "算法", "github", "python", "java"],
            "学生": ["作业", "考试", "老师", "同学", "课程", "学校", "论文", "考研"],
            "设计师": ["设计", "UI", "UX", "配色", "排版", "ps", "ai", "figma"],
            "产品经理": ["需求", "产品", "用户体验", "功能", "迭代", "PRD"],
            "教师": ["学生", "教学", "课堂", "备课", "教案", "家长"],
            "医生": ["患者", "病历", "诊断", "治疗", "医院", "科室"],
            "销售": ["客户", "业绩", "销售", "订单", "市场", "推广"],
            "自媒体": ["粉丝", "流量", "视频", "文章", "up主", "博主"],
            "运营": ["用户运营", "活动", "增长", "拉新", "留存", "转化"]
        }
        
        # 兴趣领域关键词
        self.interest_keywords = {
            "科技": ["科技", "AI", "人工智能", "机器学习", "编程", "数码", "电子产品"],
            "游戏": ["游戏", "打游戏", "王者", "吃鸡", "英雄联盟", "原神", "steam"],
            "动漫": ["动漫", "番剧", "二次元", "B站", "追番", "漫画", "cos"],
            "音乐": ["音乐", "歌曲", "听歌", "音乐会", "演唱会", "乐队"],
            "阅读": ["读书", "小说", "书籍", "阅读", "看书", "文学"],
            "运动": ["运动", "健身", "跑步", "篮球", "足球", "游泳", "瑜伽"],
            "旅游": ["旅游", "旅行", "景点", "度假", "出国", "打卡"],
            "美食": ["美食", "吃货", "火锅", "烧烤", "餐厅", "做饭", "烹饪"],
            "电影": ["电影", "影院", "看电影", "影视", "导演", "演员"],
            "摄影": ["摄影", "拍照", "相机", "镜头", "照片", "后期"]
        }
        
        # 年龄段关键词
        self.age_indicators = {
            "18-24": ["大学", "考研", "毕业", "校园", "室友", "宿舍", "社团"],
            "25-30": ["工作", "加班", "同事", "跳槽", "职场", "升职"],
            "31-40": ["结婚", "孩子", "房贷", "车贷", "家庭", "父母"],
            "40+": ["养生", "健康", "退休", "保健", "儿女"]
        }
        
        # 性别指示词
        self.gender_indicators = {
            "male": ["哥们", "兄弟", "老铁", "篮球", "足球", "游戏", "码农"],
            "female": ["姐妹", "小姐姐", "护肤", "化妆", "逛街", "包包", "美甲"]
        }
    
    def infer_from_messages(self, messages: List[Dict]) -> Dict:
        """从聊天消息推测用户属性"""
        
        # 合并所有用户消息
        user_messages = [msg["content"] for msg in messages if msg.get("role") == "user"]
        combined_text = " ".join(user_messages)
        
        result = {
            "occupation": self._infer_occupation(combined_text),
            "age_range": self._infer_age_range(combined_text),
            "gender": self._infer_gender(combined_text),
            "interests": self._extract_interests(combined_text),
            "education": self._infer_education(combined_text)
        }
        
        return result
    
    def _infer_occupation(self, text: str) -> Tuple[Optional[str], float]:
        """推测职业"""
        occupation_scores = {}
        
        for occupation, keywords in self.occupation_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text:
                    score += text.count(keyword)
            occupation_scores[occupation] = score
        
        if not occupation_scores or max(occupation_scores.values()) == 0:
            return None, 0.0
        
        best_occupation = max(occupation_scores.items(), key=lambda x: x[1])
        total_mentions = sum(occupation_scores.values())
        confidence = best_occupation[1] / total_mentions if total_mentions > 0 else 0
        
        # 至少需要3次提及才认为有效
        if best_occupation[1] >= 3:
            return best_occupation[0], min(confidence, 0.9)
        
        return None, 0.0
    
    def _infer_age_range(self, text: str) -> Tuple[Optional[str], float]:
        """推测年龄段"""
        age_scores = {}
        
        for age_range, keywords in self.age_indicators.items():
            score = sum(1 for keyword in keywords if keyword in text)
            age_scores[age_range] = score
        
        if not age_scores or max(age_scores.values()) == 0:
            return None, 0.0
        
        best_age = max(age_scores.items(), key=lambda x: x[1])
        confidence = min(best_age[1] * 0.2, 0.8)  # 最高80%置信度
        
        if best_age[1] >= 2:
            return best_age[0], confidence
        
        return None, 0.0
    
    def _infer_gender(self, text: str) -> Tuple[str, float]:
        """推测性别"""
        male_score = sum(1 for keyword in self.gender_indicators["male"] if keyword in text)
        female_score = sum(1 for keyword in self.gender_indicators["female"] if keyword in text)
        
        if male_score == 0 and female_score == 0:
            return "unknown", 0.0
        
        if male_score > female_score:
            confidence = min(male_score / (male_score + female_score), 0.7)
            return "male", confidence
        elif female_score > male_score:
            confidence = min(female_score / (male_score + female_score), 0.7)
            return "female", confidence
        else:
            return "unknown", 0.0
    
    def _extract_interests(self, text: str) -> List[Tuple[str, float]]:
        """提取兴趣领域"""
        interests = []
        
        for interest, keywords in self.interest_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score >= 2:  # 至少提及2次
                weight = min(score * 0.1, 1.0)
                interests.append((interest, weight))
        
        # 按权重排序
        interests.sort(key=lambda x: x[1], reverse=True)
        return interests[:5]  # 返回前5个兴趣
    
    def _infer_education(self, text: str) -> Tuple[Optional[str], float]:
        """推测教育程度"""
        education_keywords = {
            "博士": ["博士", "PhD", "读博", "博导"],
            "硕士": ["硕士", "研究生", "考研", "导师"],
            "本科": ["本科", "大学", "学士", "大学生"],
            "专科": ["专科", "大专"]
        }
        
        for edu_level, keywords in education_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    return edu_level, 0.7
        
        return None, 0.0
    
    def analyze_communication_style(self, messages: List[Dict]) -> Dict:
        """分析沟通风格"""
        user_messages = [msg["content"] for msg in messages if msg.get("role") == "user"]
        
        if not user_messages:
            return {}
        
        # 计算平均消息长度
        avg_length = sum(len(msg) for msg in user_messages) / len(user_messages)
        
        # 表情符号使用频率
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # 表情符号
            u"\U0001F300-\U0001F5FF"  # 符号和象形文字
            u"\U0001F680-\U0001F6FF"  # 交通和地图符号
            u"\U0001F1E0-\U0001F1FF"  # 旗帜
            "]+", flags=re.UNICODE)
        
        emoji_count = sum(len(emoji_pattern.findall(msg)) for msg in user_messages)
        emoji_ratio = emoji_count / len(user_messages)
        
        # 问号和感叹号使用
        question_marks = sum(msg.count("?") + msg.count("？") for msg in user_messages)
        exclamation_marks = sum(msg.count("!") + msg.count("！") for msg in user_messages)
        
        # 正式程度（基于标点符号和书面语）
        formal_indicators = ["请问", "您好", "谢谢", "麻烦", "不好意思"]
        casual_indicators = ["哈哈", "嘿嘿", "啊", "呀", "哦", "嗯"]
        
        formal_count = sum(sum(msg.count(word) for word in formal_indicators) for msg in user_messages)
        casual_count = sum(sum(msg.count(word) for word in casual_indicators) for msg in user_messages)
        
        return {
            "avg_message_length": int(avg_length),
            "emoji_frequency": "high" if emoji_ratio > 0.5 else "medium" if emoji_ratio > 0.2 else "low",
            "emoji_per_message": round(emoji_ratio, 2),
            "question_tendency": question_marks / len(user_messages),
            "excitement_level": exclamation_marks / len(user_messages),
            "formality": "formal" if formal_count > casual_count else "casual",
            "response_length_preference": "detailed" if avg_length > 50 else "medium" if avg_length > 20 else "short"
        }
    
    def analyze_emotional_patterns(self, messages: List[Dict]) -> Dict:
        """分析情感模式"""
        user_messages = [msg["content"] for msg in messages if msg.get("role") == "user"]
        
        if not user_messages:
            return {}
        
        # 情感关键词
        positive_words = ["开心", "高兴", "快乐", "哈哈", "喜欢", "爱", "棒", "好", "赞", "不错", "太好了"]
        negative_words = ["难过", "伤心", "生气", "烦", "累", "讨厌", "糟糕", "不好", "失望"]
        anxious_words = ["焦虑", "紧张", "担心", "害怕", "不安", "压力"]
        
        positive_count = sum(sum(msg.count(word) for word in positive_words) for msg in user_messages)
        negative_count = sum(sum(msg.count(word) for word in negative_words) for msg in user_messages)
        anxious_count = sum(sum(msg.count(word) for word in anxious_words) for msg in user_messages)
        
        total_emotional = positive_count + negative_count + anxious_count
        
        if total_emotional == 0:
            positive_ratio = 0.5
            stress_level = "low"
        else:
            positive_ratio = positive_count / total_emotional
            if anxious_count / len(user_messages) > 0.5:
                stress_level = "high"
            elif anxious_count / len(user_messages) > 0.2:
                stress_level = "medium"
            else:
                stress_level = "low"
        
        return {
            "positive_ratio": round(positive_ratio, 2),
            "emotional_stability": round(1 - (negative_count / len(user_messages)), 2),
            "stress_level": stress_level,
            "anxiety_indicators": anxious_count
        }

