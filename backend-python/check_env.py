"""
检查环境变量配置
"""

import os
from dotenv import load_dotenv

print("=" * 60)
print("环境变量检查工具")
print("=" * 60)

# 加载 .env 文件
print("\n1. 加载 .env 文件...")
load_dotenv()
print("   ✅ .env 文件已加载")

# 检查硅基流动配置
print("\n2. 检查硅基流动配置：")
siliconflow_key = os.getenv("SILICONFLOW_API_KEY")
siliconflow_model = os.getenv("SILICONFLOW_MODEL")
siliconflow_base_url = os.getenv("SILICONFLOW_BASE_URL")

if siliconflow_key:
    print(f"   ✅ SILICONFLOW_API_KEY: {siliconflow_key[:15]}... (长度: {len(siliconflow_key)})")
    print(f"   ✅ SILICONFLOW_MODEL: {siliconflow_model or '未设置'}")
    print(f"   ✅ SILICONFLOW_BASE_URL: {siliconflow_base_url or '使用默认'}")
else:
    print("   ❌ SILICONFLOW_API_KEY: 未配置")

# 检查 OpenAI 配置
print("\n3. 检查 OpenAI 配置：")
openai_key = os.getenv("OPENAI_API_KEY")
openai_model = os.getenv("OPENAI_MODEL")

if openai_key:
    print(f"   ✅ OPENAI_API_KEY: {openai_key[:15]}... (长度: {len(openai_key)})")
    print(f"   ✅ OPENAI_MODEL: {openai_model or '未设置'}")
else:
    print("   ❌ OPENAI_API_KEY: 未配置")

# 检查其他配置
print("\n4. 检查服务器配置：")
port = os.getenv("PORT", "3000")
host = os.getenv("HOST", "0.0.0.0")
priority = os.getenv("AI_PROVIDER_PRIORITY", "siliconflow,openai")

print(f"   PORT: {port}")
print(f"   HOST: {host}")
print(f"   AI_PROVIDER_PRIORITY: {priority}")

# 总结
print("\n" + "=" * 60)
print("配置总结：")
print("=" * 60)

if siliconflow_key:
    print("✅ 硅基流动配置完整")
else:
    print("❌ 硅基流动未配置")

if openai_key:
    print("✅ OpenAI 配置完整")
else:
    print("⚠️  OpenAI 未配置")

if not siliconflow_key and not openai_key:
    print("\n❌ 错误：至少需要配置一个 AI 服务！")
    print("\n请按以下步骤操作：")
    print("1. 确认 .env 文件存在于 backend-python 目录")
    print("2. 检查 .env 文件内容，确保有以下配置：")
    print("\n   SILICONFLOW_API_KEY=sk-你的token")
    print("   SILICONFLOW_MODEL=Qwen/QwQ-32B")
    print("\n3. 确保没有多余的空格或引号")
    print("4. 重新启动服务")
else:
    print("\n✅ 配置正确，可以启动服务！")

print("=" * 60)

