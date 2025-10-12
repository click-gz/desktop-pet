"""
用户行为分析服务
基于用户与桌面宠物的交互行为，分析用户性格、习惯和偏好
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import Counter, defaultdict


class BehaviorAnalyzer:
    """用户行为分析器"""
    
    def __init__(self):
        pass
    
    def analyze_interaction_patterns(self, behaviors: List[Dict]) -> Dict:
        """分析用户交互模式"""
        if not behaviors:
            return {}
        
        # 按类型分组
        behavior_types = defaultdict(list)
        for behavior in behaviors:
            behavior_type = behavior.get('type', 'unknown')
            behavior_types[behavior_type].append(behavior)
        
        # 统计各类行为
        click_behaviors = behavior_types.get('pet_click', [])
        drag_behaviors = behavior_types.get('pet_drag', [])
        chat_behaviors = behavior_types.get('chat_session', [])
        state_change_behaviors = behavior_types.get('state_change', [])
        
        # 计算交互频率
        total_interactions = len(behaviors)
        click_ratio = len(click_behaviors) / max(total_interactions, 1)
        drag_ratio = len(drag_behaviors) / max(total_interactions, 1)
        chat_ratio = len(chat_behaviors) / max(total_interactions, 1)
        
        # 分析交互强度
        interaction_level = self._calculate_interaction_level(total_interactions, behaviors)
        
        return {
            "total_interactions": total_interactions,
            "click_count": len(click_behaviors),
            "drag_count": len(drag_behaviors),
            "chat_count": len(chat_behaviors),
            "state_change_count": len(state_change_behaviors),
            "click_ratio": round(click_ratio, 2),
            "drag_ratio": round(drag_ratio, 2),
            "chat_ratio": round(chat_ratio, 2),
            "interaction_level": interaction_level,
            "interaction_style": self._infer_interaction_style(click_ratio, drag_ratio, chat_ratio)
        }
    
    def _calculate_interaction_level(self, total_count: int, behaviors: List[Dict]) -> str:
        """计算交互强度等级"""
        # 基于时间跨度计算平均频率
        if not behaviors:
            return "无"
        
        timestamps = []
        for behavior in behaviors:
            try:
                metadata = behavior.get('metadata', {})
                ts_str = metadata.get('timestamp') or behavior.get('timestamp')
                if ts_str:
                    timestamps.append(datetime.fromisoformat(ts_str))
            except:
                continue
        
        if len(timestamps) < 2:
            return "低" if total_count < 10 else "中"
        
        time_span_hours = (max(timestamps) - min(timestamps)).total_seconds() / 3600
        if time_span_hours == 0:
            time_span_hours = 1
        
        interactions_per_hour = total_count / time_span_hours
        
        if interactions_per_hour > 10:
            return "极高"
        elif interactions_per_hour > 5:
            return "高"
        elif interactions_per_hour > 2:
            return "中"
        elif interactions_per_hour > 0.5:
            return "低"
        else:
            return "极低"
    
    def _infer_interaction_style(self, click_ratio: float, drag_ratio: float, chat_ratio: float) -> str:
        """推断交互风格"""
        if chat_ratio > 0.4:
            return "聊天型"
        elif drag_ratio > 0.3:
            return "操控型"
        elif click_ratio > 0.5:
            return "互动型"
        else:
            return "观察型"
    
    def infer_personality_from_behavior(self, behaviors: List[Dict]) -> Dict:
        """从行为推断性格特征"""
        if not behaviors:
            return {}
        
        # 按类型分组
        behavior_types = defaultdict(list)
        for behavior in behaviors:
            behavior_type = behavior.get('type', 'unknown')
            behavior_types[behavior_type].append(behavior)
        
        click_behaviors = behavior_types.get('pet_click', [])
        drag_behaviors = behavior_types.get('pet_drag', [])
        chat_behaviors = behavior_types.get('chat_session', [])
        
        # 计算总时长
        time_span_days = self._calculate_time_span_days(behaviors)
        
        # 推断外向性（基于互动频率）
        interactions_per_day = len(behaviors) / max(time_span_days, 1)
        extraversion = self._map_to_level(interactions_per_day, [2, 5, 10])
        
        # 推断控制欲（基于拖拽频率）
        drag_frequency = len(drag_behaviors) / max(len(behaviors), 1)
        control_desire = self._map_to_level(drag_frequency, [0.1, 0.2, 0.4])
        
        # 推断社交需求（基于聊天行为）
        chat_frequency = len(chat_behaviors) / max(time_span_days, 1)
        social_need = self._map_to_level(chat_frequency, [0.5, 1, 2])
        
        # 分析聊天时长
        avg_chat_duration = 0
        total_chat_messages = 0
        if chat_behaviors:
            total_duration = sum(
                behavior.get('metadata', {}).get('duration', 0) 
                for behavior in chat_behaviors
            )
            avg_chat_duration = total_duration / len(chat_behaviors) / 1000  # 转换为秒
            total_chat_messages = sum(
                behavior.get('metadata', {}).get('message_count', 0)
                for behavior in chat_behaviors
            )
        
        # 推断耐心程度（基于聊天时长）
        patience = self._map_to_level(avg_chat_duration, [60, 180, 600])
        
        # 推断参与度（基于总体行为多样性）
        behavior_diversity = len(behavior_types)
        engagement = self._map_to_level(behavior_diversity, [2, 4, 6])
        
        return {
            "外向性": extraversion,
            "控制欲": control_desire,
            "社交需求": social_need,
            "耐心程度": patience,
            "参与度": engagement,
            "使用习惯": self._infer_usage_habit(len(behaviors), time_span_days),
            "聊天偏好": self._infer_chat_preference(avg_chat_duration, total_chat_messages)
        }
    
    def _calculate_time_span_days(self, behaviors: List[Dict]) -> float:
        """计算行为时间跨度（天）"""
        timestamps = []
        for behavior in behaviors:
            try:
                metadata = behavior.get('metadata', {})
                ts_str = metadata.get('timestamp') or behavior.get('timestamp')
                if ts_str:
                    timestamps.append(datetime.fromisoformat(ts_str))
            except:
                continue
        
        if len(timestamps) < 2:
            return 1.0
        
        time_span = (max(timestamps) - min(timestamps)).total_seconds() / 86400
        return max(time_span, 1.0)
    
    def _map_to_level(self, value: float, thresholds: List[float]) -> str:
        """将数值映射到等级"""
        if value >= thresholds[2]:
            return "高"
        elif value >= thresholds[1]:
            return "中"
        elif value >= thresholds[0]:
            return "低"
        else:
            return "极低"
    
    def _infer_usage_habit(self, total_behaviors: int, time_span_days: float) -> str:
        """推断使用习惯"""
        behaviors_per_day = total_behaviors / max(time_span_days, 1)
        
        if behaviors_per_day > 20:
            return "重度用户"
        elif behaviors_per_day > 10:
            return "活跃用户"
        elif behaviors_per_day > 5:
            return "中度用户"
        elif behaviors_per_day > 1:
            return "轻度用户"
        else:
            return "偶尔使用"
    
    def _infer_chat_preference(self, avg_duration: float, total_messages: int) -> str:
        """推断聊天偏好"""
        if avg_duration > 600:
            return "深度交流型"
        elif avg_duration > 300:
            return "正常交流型"
        elif avg_duration > 60:
            return "快速交流型"
        elif total_messages > 0:
            return "简短交流型"
        else:
            return "很少聊天"
    
    def analyze_active_time_patterns(self, behaviors: List[Dict]) -> Dict:
        """分析活跃时段模式"""
        if not behaviors:
            return {}
        
        # 提取时间信息
        hours = []
        days_of_week = []
        
        for behavior in behaviors:
            try:
                metadata = behavior.get('metadata', {})
                ts_str = metadata.get('timestamp') or behavior.get('timestamp')
                if ts_str:
                    dt = datetime.fromisoformat(ts_str)
                    hours.append(dt.hour)
                    days_of_week.append(dt.weekday())
            except:
                continue
        
        if not hours:
            return {}
        
        # 统计时段分布
        hour_counter = Counter(hours)
        day_counter = Counter(days_of_week)
        
        # 找出高峰时段
        peak_hours = [hour for hour, count in hour_counter.most_common(3)]
        peak_days = [self._get_day_name(day) for day, count in day_counter.most_common(3)]
        
        # 判断活跃时段类型
        time_pattern = self._infer_time_pattern(hours)
        
        return {
            "peak_hours": peak_hours,
            "peak_days": peak_days,
            "time_pattern": time_pattern,
            "total_active_hours": len(set(hours)),
            "most_active_hour": hour_counter.most_common(1)[0][0] if hour_counter else None,
            "hour_distribution": dict(hour_counter)
        }
    
    def _get_day_name(self, day_index: int) -> str:
        """获取星期名称"""
        days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        return days[day_index] if 0 <= day_index < 7 else "未知"
    
    def _infer_time_pattern(self, hours: List[int]) -> str:
        """推断时间使用模式"""
        if not hours:
            return "未知"
        
        morning_count = sum(1 for h in hours if 6 <= h < 12)
        afternoon_count = sum(1 for h in hours if 12 <= h < 18)
        evening_count = sum(1 for h in hours if 18 <= h < 24)
        night_count = sum(1 for h in hours if 0 <= h < 6)
        
        total = len(hours)
        
        if evening_count / total > 0.4:
            return "夜猫子型"
        elif morning_count / total > 0.4:
            return "早起型"
        elif afternoon_count / total > 0.4:
            return "白天型"
        elif night_count / total > 0.3:
            return "深夜型"
        else:
            return "全天分散型"
    
    def analyze_state_preferences(self, behaviors: List[Dict]) -> Dict:
        """分析状态偏好"""
        state_changes = [
            b for b in behaviors 
            if b.get('type') == 'state_change'
        ]
        
        if not state_changes:
            return {}
        
        # 统计各状态切换
        state_to_counter = Counter()
        state_from_counter = Counter()
        
        for behavior in state_changes:
            metadata = behavior.get('metadata', {})
            to_state = metadata.get('to_state')
            from_state = metadata.get('from_state')
            
            if to_state:
                state_to_counter[to_state] += 1
            if from_state:
                state_from_counter[from_state] += 1
        
        # 找出最喜欢的状态
        favorite_state = state_to_counter.most_common(1)[0][0] if state_to_counter else None
        
        return {
            "total_state_changes": len(state_changes),
            "favorite_state": favorite_state,
            "state_preferences": dict(state_to_counter),
            "state_change_frequency": len(state_changes) / max(len(behaviors), 1)
        }
    
    def calculate_engagement_score(self, behaviors: List[Dict]) -> Dict:
        """计算参与度评分"""
        if not behaviors:
            return {"score": 0, "level": "无"}
        
        # 多维度评分
        interaction_score = min(len(behaviors) / 100, 1.0) * 30  # 交互次数（30分）
        
        # 行为多样性（20分）
        behavior_types = set(b.get('type') for b in behaviors)
        diversity_score = min(len(behavior_types) / 8, 1.0) * 20
        
        # 时间跨度（20分）
        time_span_days = self._calculate_time_span_days(behaviors)
        time_score = min(time_span_days / 30, 1.0) * 20
        
        # 聊天深度（30分）
        chat_behaviors = [b for b in behaviors if b.get('type') == 'chat_session']
        if chat_behaviors:
            total_messages = sum(
                b.get('metadata', {}).get('message_count', 0)
                for b in chat_behaviors
            )
            chat_score = min(total_messages / 50, 1.0) * 30
        else:
            chat_score = 0
        
        total_score = interaction_score + diversity_score + time_score + chat_score
        
        # 等级评定
        if total_score >= 80:
            level = "极高"
        elif total_score >= 60:
            level = "高"
        elif total_score >= 40:
            level = "中"
        elif total_score >= 20:
            level = "低"
        else:
            level = "极低"
        
        return {
            "score": round(total_score, 2),
            "level": level,
            "breakdown": {
                "interaction": round(interaction_score, 2),
                "diversity": round(diversity_score, 2),
                "time_span": round(time_score, 2),
                "chat_depth": round(chat_score, 2)
            }
        }
    
    def generate_behavior_summary(self, behaviors: List[Dict]) -> Dict:
        """生成完整的行为分析摘要"""
        if not behaviors:
            return {
                "total_behaviors": 0,
                "summary": "暂无行为数据"
            }
        
        interaction_patterns = self.analyze_interaction_patterns(behaviors)
        personality = self.infer_personality_from_behavior(behaviors)
        time_patterns = self.analyze_active_time_patterns(behaviors)
        state_preferences = self.analyze_state_preferences(behaviors)
        engagement = self.calculate_engagement_score(behaviors)
        
        return {
            "total_behaviors": len(behaviors),
            "interaction_patterns": interaction_patterns,
            "personality_traits": personality,
            "time_patterns": time_patterns,
            "state_preferences": state_preferences,
            "engagement": engagement,
            "analyzed_at": datetime.now().isoformat()
        }


# 全局分析器实例
behavior_analyzer = BehaviorAnalyzer()

