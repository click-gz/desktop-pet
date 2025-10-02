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
        while self.running:
            try:
                # 每30秒执行一次
                await asyncio.sleep(30)
                
                # 处理会话总结
                await self._process_session_summaries()
                
                # 处理用户画像更新
                # await self._process_profile_updates()
                
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 后台任务错误: {str(e)}")
    
    async def _process_session_summaries(self):
        """处理待总结的会话"""
        sessions = self.session_manager.get_sessions_to_summarize()
        
        for task in sessions:
            session_id = task.get('session_id')
            
            try:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始总结会话: {session_id}")
                
                # 获取完整会话上下文
                context = self.session_manager.get_full_session_context(session_id)
                
                if len(context) < 3:  # 太少的对话不总结
                    self.session_manager.remove_from_summary_queue(session_id)
                    continue
                
                # 使用LLM总结
                summary = await llm_analyzer.summarize_session(context)
                
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
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 会话总结完成: {session_id}")
                
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 会话总结失败 {session_id}: {str(e)}")
    
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


# 全局任务管理器实例（将在main.py中初始化）
task_manager: Optional[BackgroundTaskManager] = None