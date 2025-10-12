"""
用户画像服务（统一版本）
管理用户长期画像数据，包括基础属性、兴趣爱好、心理特征、社交关系等
支持规则引擎和LLM双模式分析
"""

import redis
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import hashlib


class UserProfileService:
    """用户画像服务（统一版本）"""
    
    def __init__(self, redis_client: redis.Redis, llm_analyzer=None):
        self.redis = redis_client
        self.llm_analyzer = llm_analyzer  # 可选的LLM分析器
        
        # 延迟导入以避免循环依赖
        self._inference_service = None
        self._models_loaded = False
    
    def get_user_id(self, raw_id: str = "default") -> str:
        """生成或获取用户ID"""
        if not raw_id or raw_id == "default":
            default_key = "user:default:mapping"
            existing_id = self.redis.get(default_key)
            if existing_id:
                return existing_id.decode() if isinstance(existing_id, bytes) else existing_id
            
            user_id = hashlib.md5(f"default_{datetime.now().isoformat()}".encode()).hexdigest()
            self.redis.set(default_key, user_id)
            return user_id
        
        mapping_key = f"user:{raw_id}:mapping"
        existing_id = self.redis.get(mapping_key)
        if existing_id:
            return existing_id.decode() if isinstance(existing_id, bytes) else existing_id
        
        user_id = hashlib.md5(raw_id.encode()).hexdigest()
        self.redis.set(mapping_key, user_id)
        return user_id
    
    async def init_user(self, user_id: str):
        """初始化用户画像"""
        profile_key = f"user:{user_id}:profile"
        
        if self.redis.exists(profile_key):
            return
        
        initial_profile = {
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "last_seen": datetime.now().isoformat(),
            "total_interactions": "0",
            "intimacy_score": "0",
            "relationship_level": "陌生人",
            "interests": json.dumps([]),
            "personality_traits": json.dumps({}),
            "preferences": json.dumps({}),
            "chat_style": json.dumps({}),
        }
        
        self.redis.hset(profile_key, mapping=initial_profile)
        print(f"✅ 初始化用户画像: {user_id}")
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """获取用户画像"""
        profile_key = f"user:{user_id}:profile"
        data = self.redis.hgetall(profile_key)
        
        if not data:
            return None
        
        result = {}
        for k, v in data.items():
            k_str = k.decode() if isinstance(k, bytes) else k
            v_str = v.decode() if isinstance(v, bytes) else v
            
            if k_str in ['interests', 'personality_traits', 'preferences', 'chat_style']:
                try:
                    result[k_str] = json.loads(v_str)
                except:
                    result[k_str] = v_str
            else:
                result[k_str] = v_str
        
        return result
    
    def save_chat_message(self, user_id: str, role: str, content: str):
        """保存聊天消息到长期历史"""
        history_key = f"user:{user_id}:chat_history"
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        self.redis.rpush(history_key, json.dumps(message))
        self.redis.ltrim(history_key, -500, -1)
    
    def get_chat_history(self, user_id: str, limit: int = 100) -> List[Dict]:
        """获取聊天历史"""
        history_key = f"user:{user_id}:chat_history"
        messages = self.redis.lrange(history_key, -limit, -1)
        
        return [json.loads(msg) for msg in messages]
    
    def record_behavior(self, user_id: str, behavior_type: str, metadata: Dict = None):
        """记录用户行为"""
        behavior_key = f"user:{user_id}:behaviors"
        
        behavior = {
            "type": behavior_type,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        self.redis.rpush(behavior_key, json.dumps(behavior))
        self.redis.ltrim(behavior_key, -200, -1)
    
    def update_last_seen(self, user_id: str):
        """更新最后活跃时间"""
        profile_key = f"user:{user_id}:profile"
        self.redis.hset(profile_key, "last_seen", datetime.now().isoformat())
    
    def increment_interaction(self, user_id: str):
        """增加交互次数"""
        profile_key = f"user:{user_id}:profile"
        self.redis.hincrby(profile_key, "total_interactions", 1)
    
    def add_interest_tags(self, user_id: str, tags: List[str]):
        """添加兴趣标签"""
        profile_key = f"user:{user_id}:profile"
        
        current_interests_str = self.redis.hget(profile_key, "interests")
        if current_interests_str:
            current_interests_str = current_interests_str.decode() if isinstance(current_interests_str, bytes) else current_interests_str
            current_interests = json.loads(current_interests_str) if current_interests_str else []
        else:
            current_interests = []
        
        updated_interests = list(set(current_interests + tags))
        self.redis.hset(profile_key, "interests", json.dumps(updated_interests, ensure_ascii=False))
        print(f"✅ 更新用户兴趣标签: {user_id[:8]} -> {updated_interests}")
    
    def update_intimacy_score(self, user_id: str, increment: int = 1) -> Tuple[int, str]:
        """更新亲密度分数"""
        profile_key = f"user:{user_id}:profile"
        
        new_score = self.redis.hincrby(profile_key, "intimacy_score", increment)
        level = self._calculate_relationship_level(new_score)
        self.redis.hset(profile_key, "relationship_level", level)
        
        return new_score, level
    
    def _calculate_relationship_level(self, score: int) -> str:
        """计算关系等级"""
        if score < 10:
            return "陌生人"
        elif score < 30:
            return "初识"
        elif score < 60:
            return "熟人"
        elif score < 100:
            return "朋友"
        elif score < 200:
            return "好友"
        else:
            return "挚友"
    
    def calculate_intimacy(self, user_id: str) -> int:
        """计算当前亲密度"""
        profile = self.get_user_profile(user_id)
        if profile:
            return int(profile.get('intimacy_score', 0))
        return 0
    
    def update_personality_traits(self, user_id: str, traits: Dict):
        """更新性格特征"""
        profile_key = f"user:{user_id}:profile"
        
        current_traits_str = self.redis.hget(profile_key, "personality_traits")
        if current_traits_str:
            current_traits_str = current_traits_str.decode() if isinstance(current_traits_str, bytes) else current_traits_str
            current_traits = json.loads(current_traits_str) if current_traits_str else {}
        else:
            current_traits = {}
        
        current_traits.update(traits)
        self.redis.hset(profile_key, "personality_traits", json.dumps(current_traits, ensure_ascii=False))
        print(f"✅ 更新用户性格特征: {user_id[:8]} -> {current_traits}")
    
    def get_chat_context_prompt(self, user_id: str) -> str:
        """生成个性化聊天上下文提示"""
        profile = self.get_user_profile(user_id)
        
        if not profile:
            return ""
        
        context_parts = []
        
        relationship = profile.get('relationship_level', '陌生人')
        context_parts.append(f"你和主人的关系是：{relationship}")
        
        interests = profile.get('interests', [])
        if interests:
            context_parts.append(f"主人的兴趣爱好包括：{', '.join(interests[:5])}")
        
        traits = profile.get('personality_traits', {})
        if traits:
            trait_desc = ', '.join([f"{k}({v})" for k, v in list(traits.items())[:3]])
            context_parts.append(f"主人的性格特点：{trait_desc}")
        
        intimacy = int(profile.get('intimacy_score', 0))
        if intimacy > 50:
            context_parts.append("你们已经比较熟悉了，可以更亲密和随意一些")
        
        if not context_parts:
            return ""
        
        return "【用户画像】\n" + "\n".join(context_parts) + "\n\n请根据这些信息，以更个性化的方式回复主人。"
    
    async def update_profile_from_llm_analysis(self, user_id: str, analysis: Dict):
        """根据LLM分析结果更新用户画像"""
        try:
            if 'interests' in analysis and analysis['interests']:
                self.add_interest_tags(user_id, analysis['interests'])
            
            if 'personality' in analysis and analysis['personality']:
                self.update_personality_traits(user_id, analysis['personality'])
            
            if 'preferences' in analysis and analysis['preferences']:
                profile_key = f"user:{user_id}:profile"
                current_prefs_str = self.redis.hget(profile_key, "preferences")
                if current_prefs_str:
                    current_prefs_str = current_prefs_str.decode() if isinstance(current_prefs_str, bytes) else current_prefs_str
                    current_prefs = json.loads(current_prefs_str) if current_prefs_str else {}
                else:
                    current_prefs = {}
                
                current_prefs.update(analysis['preferences'])
                self.redis.hset(profile_key, "preferences", json.dumps(current_prefs, ensure_ascii=False))
            
            print(f"✅ LLM画像更新完成: {user_id[:8]}")
            
        except Exception as e:
            print(f"❌ LLM画像更新失败: {str(e)}")
    
    def _get_inference_service(self):
        """延迟加载推测服务"""
        if self._inference_service is None:
            try:
                from services.user_inference_service import UserInferenceService
                self._inference_service = UserInferenceService()
            except Exception as e:
                print(f"⚠️  无法加载推测服务: {str(e)}")
                self._inference_service = None
        return self._inference_service
    
    async def update_enhanced_profile(self, user_id: str, force_llm: bool = False):
        """
        统一的画像更新方法
        
        Args:
            user_id: 用户ID
            force_llm: 是否强制使用LLM分析（默认根据消息数量自动判断）
        """
        try:
            # 获取聊天历史
            messages = self.get_chat_history(user_id, limit=100)
            
            # 🔧 降低消息数量限制，从5降到2
            if len(messages) < 2:
                print(f"  ⏭️  用户 {user_id[:8]} 消息太少({len(messages)}条)，跳过更新")
                return
            
            # 1. 使用规则引擎进行快速推测
            inference_service = self._get_inference_service()
            if inference_service:
                await self._update_from_rules(user_id, messages, inference_service)
            else:
                print(f"  ⚠️  用户 {user_id[:8]} 规则引擎未加载")
            
            # 2. 如果有LLM分析器且消息足够多，使用LLM深度分析
            if self.llm_analyzer and (len(messages) >= 8 or force_llm):
                await self._update_from_llm(user_id, messages)
                print(f"✅ 用户画像已更新(含LLM): {user_id[:8]} ({len(messages)}条消息)")
            else:
                print(f"✅ 用户画像已更新(规则): {user_id[:8]} ({len(messages)}条消息)")
            
        except Exception as e:
            print(f"❌ 画像更新失败 {user_id[:8]}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def _update_from_rules(self, user_id: str, messages: List[Dict], inference_service):
        """使用规则引擎更新画像"""
        try:
            # 推测基础属性
            inference_result = inference_service.infer_from_messages(messages)
            
            profile_key = f"user:{user_id}:profile"
            
            # 更新职业
            if inference_result.get("occupation"):
                occupation, confidence = inference_result["occupation"]
                if confidence > 0.5:
                    current_data = self.redis.hget(profile_key, "occupation_data")
                    if not current_data or confidence > 0.6:  # 新数据或更高置信度才更新
                        occupation_data = json.dumps({
                            "value": occupation,
                            "confidence": confidence
                        }, ensure_ascii=False)
                        self.redis.hset(profile_key, "occupation_data", occupation_data)
            
            # 更新年龄段
            if inference_result.get("age_range"):
                age_range, confidence = inference_result["age_range"]
                if confidence > 0.4:
                    age_data = json.dumps({
                        "value": age_range,
                        "confidence": confidence
                    }, ensure_ascii=False)
                    self.redis.hset(profile_key, "age_data", age_data)
            
            # 更新性别
            if inference_result.get("gender"):
                gender, confidence = inference_result["gender"]
                if confidence > 0.5:
                    gender_data = json.dumps({
                        "value": gender,
                        "confidence": confidence
                    }, ensure_ascii=False)
                    self.redis.hset(profile_key, "gender_data", gender_data)
            
            # 更新兴趣标签（累积）
            if inference_result.get("interests"):
                interests_to_add = [interest for interest, weight in inference_result["interests"]]
                if interests_to_add:
                    self.add_interest_tags(user_id, interests_to_add)
            
            # 分析沟通风格
            comm_style = inference_service.analyze_communication_style(messages)
            if comm_style:
                self.redis.hset(profile_key, "communication_style", 
                               json.dumps(comm_style, ensure_ascii=False))
            
            # 分析情感模式
            emotional = inference_service.analyze_emotional_patterns(messages)
            if emotional:
                self.redis.hset(profile_key, "emotional_pattern",
                               json.dumps(emotional, ensure_ascii=False))
            
        except Exception as e:
            print(f"规则引擎更新失败: {str(e)}")
    
    async def _update_from_llm(self, user_id: str, messages: List[Dict]):
        """使用LLM深度分析更新画像"""
        try:
            # 获取当前画像作为上下文
            profile = self.get_user_profile(user_id)
            
            # 调用LLM分析
            analysis = await self.llm_analyzer.analyze_user_profile_comprehensive(
                messages, profile
            )
            
            if not analysis:
                return
            
            profile_key = f"user:{user_id}:profile"
            
            # 应用LLM分析结果
            if 'personality' in analysis and analysis['personality']:
                self.update_personality_traits(user_id, analysis['personality'])
            
            if 'interest_tags' in analysis and analysis['interest_tags']:
                # 更新兴趣标签（LLM版本更详细）
                for category, data in analysis['interest_tags'].items():
                    if isinstance(data, dict) and 'weight' in data:
                        self.add_interest_tags(user_id, [category])
            
            if 'current_mood' in analysis:
                mood_data = {
                    "mood": analysis['current_mood'],
                    "timestamp": datetime.now().isoformat()
                }
                self.redis.hset(profile_key, "current_mood",
                               json.dumps(mood_data, ensure_ascii=False))
            
            if 'motivations' in analysis and analysis['motivations']:
                self.redis.hset(profile_key, "motivations",
                               json.dumps(analysis['motivations'], ensure_ascii=False))
            
            print(f"✅ LLM深度分析完成: {user_id[:8]}")
            
        except Exception as e:
            print(f"LLM深度分析失败: {str(e)}")
    
    def get_profile_summary(self, user_id: str) -> Dict[str, Any]:
        """获取完整的画像摘要（统一接口，用于展示）"""
        profile_key = f"user:{user_id}:profile"
        basic_profile = self.get_user_profile(user_id)
        
        if not basic_profile:
            return {}
        
        # 🆕 获取行为数据并分析
        behavior_analysis = self._analyze_user_behaviors(user_id)
        
        # 构建统一的完整画像摘要
        summary = {
            "user_id": user_id,
            "created_at": basic_profile.get("created_at"),
            "last_updated": basic_profile.get("last_seen"),
            "demographics": {},
            "interests": {
                "interest_tags": {},
                "tags": basic_profile.get("interests", []),
                "content_preferences": {},
                "peak_active_hours": behavior_analysis.get("time_patterns", {}).get("peak_hours", [])
            },
            "psychological": {
                "personality_traits": basic_profile.get("personality_traits", {}),
                "communication_style": {},
                "emotional_state": {},
                "big_five_personality": {},
                # 🆕 添加行为推断的性格特征
                "behavior_personality": behavior_analysis.get("personality_traits", {})
            },
            "social": {
                "ai_relationship": {
                    "intimacy_score": int(basic_profile.get("intimacy_score", 0)),
                    "relationship_level": basic_profile.get("relationship_level", "陌生人"),
                    "trust_level": 0,
                    "interaction_comfort": 0
                },
                "interaction_patterns": behavior_analysis.get("interaction_patterns", {})
            },
            "statistics": {
                "total_interactions": int(basic_profile.get("total_interactions", 0)),
                "total_messages": 0,
                "total_sessions": 0,
                "days_since_registration": 0
            },
            # 🆕 添加行为统计
            "behavior_analysis": behavior_analysis
        }
        
        # 读取所有增强数据
        try:
            # 职业数据
            occupation_data = self.redis.hget(profile_key, "occupation_data")
            if occupation_data:
                occupation_data = occupation_data.decode() if isinstance(occupation_data, bytes) else occupation_data
                occ = json.loads(occupation_data)
                summary["demographics"]["occupation"] = occ.get("value")
                summary["demographics"]["occupation_confidence"] = occ.get("confidence", 0)
            
            # 年龄数据
            age_data = self.redis.hget(profile_key, "age_data")
            if age_data:
                age_data = age_data.decode() if isinstance(age_data, bytes) else age_data
                age = json.loads(age_data)
                summary["demographics"]["age_range"] = age.get("value")
                summary["demographics"]["age_confidence"] = age.get("confidence", 0)
            
            # 性别数据
            gender_data = self.redis.hget(profile_key, "gender_data")
            if gender_data:
                gender_data = gender_data.decode() if isinstance(gender_data, bytes) else gender_data
                gender = json.loads(gender_data)
                summary["demographics"]["gender"] = gender.get("value")
                summary["demographics"]["gender_confidence"] = gender.get("confidence", 0)
            
            # 沟通风格
            comm_style = self.redis.hget(profile_key, "communication_style")
            if comm_style:
                comm_style = comm_style.decode() if isinstance(comm_style, bytes) else comm_style
                summary["psychological"]["communication_style"] = json.loads(comm_style)
            
            # 情感模式
            emotional = self.redis.hget(profile_key, "emotional_pattern")
            if emotional:
                emotional = emotional.decode() if isinstance(emotional, bytes) else emotional
                summary["psychological"]["emotional_state"] = json.loads(emotional)
            
            # 当前情绪
            mood = self.redis.hget(profile_key, "current_mood")
            if mood:
                mood = mood.decode() if isinstance(mood, bytes) else mood
                mood_data = json.loads(mood)
                summary["psychological"]["current_mood"] = mood_data
            
            # 动机需求
            motivations = self.redis.hget(profile_key, "motivations")
            if motivations:
                motivations = motivations.decode() if isinstance(motivations, bytes) else motivations
                summary["psychological"]["motivations"] = json.loads(motivations)
            
            # 将兴趣标签转换为带权重的格式
            if summary["interests"]["tags"]:
                for tag in summary["interests"]["tags"]:
                    summary["interests"]["interest_tags"][tag] = {
                        "weight": 0.7,
                        "sub_tags": [],
                        "trend": "稳定"
                    }
            
            # 计算信任度和互动舒适度
            intimacy = summary["social"]["ai_relationship"]["intimacy_score"]
            summary["social"]["ai_relationship"]["trust_level"] = min(intimacy / 200, 1.0)
            summary["social"]["ai_relationship"]["interaction_comfort"] = min(intimacy / 150, 1.0)
            
            # 计算注册天数
            if summary.get("created_at"):
                created = datetime.fromisoformat(summary["created_at"])
                days = (datetime.now() - created).days
                summary["statistics"]["days_since_registration"] = days
            
        except Exception as e:
            print(f"读取增强数据失败: {str(e)}")
        
        return summary
    
    def _analyze_user_behaviors(self, user_id: str) -> Dict[str, Any]:
        """分析用户行为数据"""
        try:
            # 导入行为分析器
            from services.behavior_analyzer import behavior_analyzer
            
            # 获取用户行为数据
            behavior_key = f"user:{user_id}:behaviors"
            behaviors_raw = self.redis.lrange(behavior_key, 0, -1)
            
            if not behaviors_raw:
                return {
                    "total_behaviors": 0,
                    "message": "暂无行为数据"
                }
            
            # 解析行为数据
            behaviors = []
            for b in behaviors_raw:
                try:
                    behavior = json.loads(b)
                    behaviors.append(behavior)
                except:
                    continue
            
            # 使用行为分析器生成完整分析
            analysis = behavior_analyzer.generate_behavior_summary(behaviors)
            
            return analysis
            
        except Exception as e:
            print(f"行为分析失败: {str(e)}")
            return {}
