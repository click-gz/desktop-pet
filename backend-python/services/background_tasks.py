"""
后台异步任务处理
处理会话总结和用户画像更新
"""

import asyncio
import threading
from datetime import datetime
from typing import Optional, Dict
from services.session_manager import SessionManager
from services.user_profile_service import UserProfileService
from services.llm_profile_analyzer import llm_analyzer


class BackgroundTaskManager:
    """后台任务管理器"""
    
    def __init__(
        self, 
        session_manager: SessionManager,
        profile_service: UserProfileService
    ):
        self.session_manager = session_manager
        self.profile_service = profile_service
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
    def start(self):
        """启动后台任务"""
        if self.running:
            print("⚠️  后台任务已在运行")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_async_loop, daemon=True)
        self.thread.start()
        print("✅ 后台任务已启动")
    
    def stop(self):
        """停止后台任务"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("✅ 后台任务已停止")
    
    def _run_async_loop(self):
        """运行异步事件循环"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(self._worker())
        except Exception as e:
            print(f"后台任务错误: {str(e)}")
        finally:
            loop.close()
    
    async def _worker(self):
        """后台工作任务"""
        cycle_count = 0
        while self.running:
            try:
                # 每30秒执行一次
                await asyncio.sleep(30)
                cycle_count += 1
                
                # 处理会话总结
                await self._process_session_summaries()
                
                # 每30s 更新一次用户画像
                if cycle_count % 1 == 0:
                    await self._process_profile_updates()
                
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 后台任务错误: {str(e)}")
    
    async def _process_session_summaries(self):
        """处理待总结的会话（使用增量分析）"""
        sessions = self.session_manager.get_sessions_to_summarize()
        
        for task in sessions:
            session_id = task.get('session_id')
            
            try:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 🔄 开始总结会话: {session_id[:8]}...")
                
                # ✅ 改进：只获取新消息（增量）
                new_context = self.session_manager.get_new_session_context(session_id)
                
                if len(new_context) < 3:  # 太少的对话不总结
                    print(f"  ⏭️  新消息太少（{len(new_context)}条），跳过总结")
                    self.session_manager.remove_from_summary_queue(session_id)
                    continue
                
                # 获取上次总结的简要内容（用于提供上下文）
                previous_summary_context = self.session_manager.get_last_summary_context(session_id)
                
                if previous_summary_context:
                    print(f"  📚 使用历史上下文辅助分析")
                
                # ✅ 使用LLM总结（带历史上下文）
                summary = await llm_analyzer.summarize_session(
                    new_context, 
                    previous_summary_context
                )
                
                # 保存总结
                self.session_manager.save_session_summary(session_id, summary)
                
                # 获取用户ID并更新画像
                session_data = self.session_manager.get_session_data(session_id)
                if session_data:
                    user_id = session_data.get('user_id')
                    # 将总结信息合并到用户画像
                    self._merge_summary_to_profile(user_id, summary)
                
                # 从队列移除
                self.session_manager.remove_from_summary_queue(session_id)
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ 会话总结完成: {session_id[:8]}...")
                
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ 会话总结失败 {session_id[:8]}: {str(e)}")
    
    def _merge_summary_to_profile(self, user_id: str, summary: Dict):
        """将会话总结合并到用户画像"""
        try:
            # 提取兴趣标签
            interests = summary.get('interests_mentioned', [])
            if interests:
                self.profile_service.add_interest_tags(user_id, interests)
            
            # 更新亲密度（如果关系有进展）
            relationship_progress = summary.get('relationship_progress', '')
            if '进展' in relationship_progress or '信任' in relationship_progress:
                # 增加额外的亲密度奖励
                current_score = self.profile_service.calculate_intimacy(user_id)
                # 可以添加额外逻辑
            
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 用户画像已更新: {user_id}")
            
        except Exception as e:
            print(f"合并总结到画像失败: {str(e)}")
    
    async def _process_profile_updates(self):
        """批量更新用户画像（后台任务）"""
        try:
            # 获取所有用户（限制每次处理数量）
            user_profile_keys = self.profile_service.redis.keys("user:*:profile")
            
            # 每次最多处理10个用户（提高处理效率）
            users_to_process = user_profile_keys[:10]
            updated_count = 0
            
            for profile_key in users_to_process:
                try:
                    # 提取用户ID
                    key_str = profile_key.decode() if isinstance(profile_key, bytes) else profile_key
                    user_id = key_str.replace("user:", "").replace(":profile", "")
                    
                    # 检查最后更新时间，避免频繁更新
                    last_update_key = f"user:{user_id}:last_profile_update"
                    last_update = self.profile_service.redis.get(last_update_key)
                    
                    if last_update:
                        last_update_str = last_update.decode() if isinstance(last_update, bytes) else last_update
                        last_time = datetime.fromisoformat(last_update_str)
                        # 🔧 修复：使用 total_seconds() 而不是 seconds，3分钟内更新过才跳过（缩短限制时间）
                        time_diff = (datetime.now() - last_time).total_seconds()
                        if time_diff < 180:  # 3分钟
                            print(f"  ⏭️  跳过用户 {user_id[:8]} (上次更新: {int(time_diff)}秒前)")
                            continue
                    
                    # 更新画像
                    await self.profile_service.update_enhanced_profile(user_id)
                    updated_count += 1
                    
                    # 记录更新时间
                    self.profile_service.redis.set(
                        last_update_key, 
                        datetime.now().isoformat(),
                        ex=600  # 10分钟过期
                    )
                    
                except Exception as e:
                    print(f"更新用户 {user_id[:8]} 画像失败: {str(e)}")
                    continue
            
            if updated_count > 0:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 🎯 批量更新完成: {updated_count}个用户")
                    
        except Exception as e:
            print(f"批量更新画像失败: {str(e)}")


# 全局任务管理器实例（将在main.py中初始化）
task_manager: Optional[BackgroundTaskManager] = None