"""
Sample test data for SyncHire prompt testing

Contains realistic Chinese and English JDs, resumes, and edge cases.
"""

# Chinese JD Samples
CHINESE_JD_SAMPLES = {
    "backend_engineer": """
    职位：高级后端开发工程师
    部门：技术研发部
    类型：全职
    地点：上海

    职责：
    - 负责核心业务系统的后端开发和维护
    - 参与系统架构设计和技术方案评审
    - 优化系统性能，提升用户体验
    - 指导初级工程师，进行代码审查

    要求：
    - 本科及以上学历，计算机相关专业
    - 5年以上Java开发经验，熟悉Spring Boot、MyBatis
    - 熟悉MySQL、Redis等数据库，有性能优化经验
    - 有高并发、分布式系统经验者优先
    - 良好的沟通能力和团队协作精神
    - 有金融科技行业经验者优先

    薪资范围：25k-45k/月
    """,

    "frontend_engineer": """
    职位：前端开发工程师
    类型：全职
    地点：北京/远程

    职责：
    - 开发和维护公司产品的Web前端
    - 优化前端性能和用户体验
    - 与产品和设计团队协作

    要求：
    - 3年以上前端开发经验
    - 精通React.js及其生态系统
    - 熟悉TypeScript、Next.js
    - 有移动端开发经验
    - 良好的代码风格和文档习惯
    """,

    "product_manager": """
    职位：产品经理（教育科技方向）
    部门：产品部

    职责：
    - 负责在线教育产品的规划和迭代
    - 进行用户研究和需求分析
    - 撰写产品文档，协调开发资源
    - 跟踪产品数据，持续优化

    要求：
    - 2年以上互联网产品经验
    - 有教育行业产品经验优先
    - 良好的数据分析能力
    - 优秀的沟通和协调能力
    - 本科及以上学历
    """
}

# English JD Samples
ENGLISH_JD_SAMPLES = {
    "software_engineer": """
    Senior Software Engineer

    Department: Engineering
    Type: Full-time
    Location: San Francisco / Remote

    Responsibilities:
    - Design and develop scalable backend services
    - Collaborate with cross-functional teams
    - Participate in code reviews and architectural decisions
    - Mentor junior engineers

    Requirements:
    - 5+ years of experience in software development
    - Proficiency in Python, Go, or Java
    - Experience with cloud platforms (AWS, GCP, or Azure)
    - Knowledge of microservices architecture
    - Strong problem-solving skills
    - Bachelor's degree in Computer Science or related field

    Salary: $150k-$200k
    """,

    "data_scientist": """
    Data Scientist - Machine Learning

    Type: Full-time
    Location: New York

    Key Responsibilities:
    - Develop and deploy machine learning models
    - Analyze large datasets to generate insights
    - Collaborate with engineering teams on productionization
    - Research and implement state-of-the-art ML techniques

    Qualifications:
    - MS/PhD in Computer Science, Statistics, or related field
    - 3+ years of experience in data science
    - Strong programming skills in Python
    - Experience with TensorFlow, PyTorch, or scikit-learn
    - Knowledge of SQL and data visualization tools
    - Excellent communication skills
    """,

    "devops_engineer": """
    DevOps Engineer

    Location: Remote

    What you'll do:
    - Build and maintain CI/CD pipelines
    - Manage cloud infrastructure on AWS
    - Implement monitoring and alerting systems
    - Automate deployment processes

    Requirements:
    - 3+ years of DevOps experience
    - Strong knowledge of Docker and Kubernetes
    - Experience with infrastructure as code (Terraform, CloudFormation)
    - Proficiency in scripting (Python, Bash)
    - Understanding of security best practices
    - Good communication skills
    """
}

# Mixed Language JD Samples
MIXED_JD_SAMPLES = {
    "full_stack": """
    职位：Full Stack Developer 全栈开发工程师

    Team: Platform Team 平台团队
    Type: Fulltime 全职

    Responsibilities 职责:
    - Develop responsive web applications using React and Node.js
    - 设计并实现RESTful API
    - Collaborate with designers and product managers 与产品经理协作
    - Optimize application performance 优化应用性能

    Requirements 要求:
    - 3+ years of full-stack development experience
    - Proficient in React, TypeScript, Node.js 熟练使用React/TS/Node
    - Experience with PostgreSQL and Redis
    - Knowledge of cloud services (AWS, Azure) 了解云服务
    - Good communication skills in English and Chinese 中英文沟通能力
    """,

    "ai_engineer": """
    AI Engineer 人工智能工程师

    Department: AI Lab 人工智能实验室

    About the Role:
    我们正在寻找一位AI工程师，负责开发 and deploying ML models.

    Responsibilities:
    - Design and implement machine learning solutions
    - 参与模型训练和优化
    - Work with large-scale datasets 处理大规模数据
    - Collaborate with research teams

    Requirements:
    - MS in CS/ML related field 计算机相关硕士
    - 2+ years of experience in ML/AI 两年以上ML/AI经验
    - Strong Python programming skills 扎实的Python能力
    - Experience with PyTorch or TensorFlow
    - Knowledge of NLP or Computer Vision 了解NLP或CV
    - Good English communication skills 良好的英语沟通
    """
}

# Resume Samples
RESUME_SAMPLES = {
    "software_engineer_cn": {
        "name": "张明",
        "contact": {
            "email": "zhangming@example.com",
            "phone": "138-0000-0000"
        },
        "summary": "3年后端开发经验，专注Python和Django",
        "education": {
            "degree": "学士",
            "major": "计算机科学与技术",
            "school": "上海交通大学",
            "year": "2021"
        },
        "skills": [
            "Python",
            "Django",
            "Flask",
            "PostgreSQL",
            "Redis",
            "Docker",
            "Git",
            "RESTful API"
        ],
        "experience": [
            {
                "id": "exp_001",
                "title": "后端开发工程师",
                "company": "上海某互联网公司",
                "dates": "2021.03 - 至今",
                "description": "负责电商平台的后端开发和维护",
                "achievements": [
                    "使用Django重构订单系统，性能提升40%",
                    "实现Redis缓存策略，页面加载时间减少60%",
                    "优化数据库查询，支持日均10万+订单"
                ],
                "technologies": ["Python", "Django", "PostgreSQL", "Redis", "Celery"]
            },
            {
                "id": "exp_002",
                "title": "软件开发实习生",
                "company": "某科技公司",
                "dates": "2020.06 - 2021.02",
                "description": "参与Web应用开发",
                "achievements": [
                    "开发了用户管理模块",
                    "编写单元测试，覆盖率达到80%"
                ],
                "technologies": ["Python", "Flask", "MySQL", "JUnit"]
            }
        ],
        "projects": [
            {
                "id": "proj_001",
                "name": "个人博客系统",
                "role": "独立开发者",
                "date": "2020",
                "description": "基于Django的博客平台",
                "technologies": ["Django", "Bootstrap", "SQLite"]
            }
        ]
    },

    "frontend_engineer_en": {
        "name": "Sarah Chen",
        "contact": {
            "email": "sarah.chen@example.com",
            "phone": "+1-555-0123"
        },
        "summary": "Frontend developer with 4 years of React experience",
        "education": {
            "degree": "Bachelor of Science",
            "major": "Computer Science",
            "school": "University of California, Berkeley",
            "year": "2020"
        },
        "skills": [
            "React",
            "TypeScript",
            "Next.js",
            "JavaScript (ES6+)",
            "HTML5/CSS3",
            "TailwindCSS",
            "Redux",
            "GraphQL"
        ],
        "experience": [
            {
                "id": "exp_001",
                "title": "Senior Frontend Developer",
                "company": "TechStartup Inc",
                "dates": "2022 - Present",
                "description": "Lead frontend development for SaaS platform",
                "achievements": [
                    "Reduced initial load time by 50% through code splitting",
                    "Implemented comprehensive testing suite (90% coverage)",
                    "Mentored 2 junior developers"
                ],
                "technologies": ["React", "TypeScript", "Next.js", "Jest", "AWS"]
            },
            {
                "id": "exp_002",
                "title": "Frontend Developer",
                "company": "WebAgency Co",
                "dates": "2020 - 2022",
                "description": "Developed responsive web applications",
                "achievements": [
                    "Built 20+ responsive websites for various clients",
                    "Improved development workflow with CI/CD setup"
                ],
                "technologies": ["React", "JavaScript", "SASS", "Webpack"]
            }
        ],
        "projects": [
            {
                "id": "proj_001",
                "name": "E-commerce Dashboard",
                "role": "Lead Developer",
                "date": "2023",
                "description": "Real-time analytics dashboard for online stores",
                "technologies": ["React", "D3.js", "Node.js", "PostgreSQL"]
            }
        ]
    },

    "career_changer": {
        "name": "李华",
        "contact": {
            "email": "lihua@example.com"
        },
        "summary": "从传统行业转行做程序员，有强烈的学习热情",
        "education": {
            "degree": "硕士",
            "major": "机械工程",
            "school": "同济大学",
            "year": "2019"
        },
        "skills": [
            "Python",
            "JavaScript",
            "HTML/CSS",
            "SQL"
        ],
        "experience": [
            {
                "id": "exp_001",
                "title": "机械工程师",
                "company": "某制造企业",
                "dates": "2019 - 2023",
                "description": "负责设备维护和工艺优化",
                "achievements": [
                    "优化生产线流程，效率提升15%"
                ],
                "technologies": ["AutoCAD", "MATLAB"]
            }
        ],
        "projects": [
            {
                "id": "proj_001",
                "name": "自学编程项目",
                "role": "独立学习",
                "date": "2023 - 2024",
                "description": "完成了在线课程，做了几个小项目",
                "technologies": ["Python", "Django", "React"]
            }
        ]
    }
}

# Edge Case Test Data
EDGE_CASES = {
    "empty_jd": "",

    "minimal_jd": "We need a developer.",

    "malformed_jd": """
    JOB!!!111
    skills: everything
    salary: $$$$
    """,

    "very_long_jd": """
    Senior Full Stack Engineer

    """ + "\n".join([f"- Requirement {i}: Some detailed requirement description" for i in range(50)]),

    "special_characters_jd": """
    职位：C++开发工程师（底层系统）
    要求：熟悉C++11/14/17标准、STL、Boost库
    工具：CMake, Git, Docker, Kubernetes
    薪资：¥30k-50k/月 ⚡️💰
    """,

    "empty_resume": {
        "name": "",
        "experience": [],
        "skills": [],
        "education": {}
    },

    "minimal_resume": {
        "name": "测试用户"
    },

    "multiple_short_jobs": {
        "name": "频繁跳槽者",
        "experience": [
            {"title": "工程师", "company": "A公司", "dates": "2023.01 - 2023.06"},
            {"title": "工程师", "company": "B公司", "dates": "2023.07 - 2023.12"},
            {"title": "工程师", "company": "C公司", "dates": "2024.01 - 2024.06"}
        ]
    },

    "employment_gap": {
        "name": "有空窗期",
        "experience": [
            {"title": "工程师", "company": "A公司", "dates": "2020 - 2021"},
            # Gap from 2021-2023
            {"title": "工程师", "company": "B公司", "dates": "2023 - 至今"}
        ]
    }
}


def get_test_jd(language: str = "chinese", role: str = "backend") -> str:
    """Get a test JD by language and role"""
    if language == "chinese":
        return CHINESE_JD_SAMPLES.get(role, CHINESE_JD_SAMPLES["backend_engineer"])
    elif language == "english":
        return ENGLISH_JD_SAMPLES.get(role, ENGLISH_JD_SAMPLES["software_engineer"])
    elif language == "mixed":
        return MIXED_JD_SAMPLES.get(role, MIXED_JD_SAMPLES["full_stack"])
    else:
        raise ValueError(f"Unknown language: {language}")


def get_test_resume(profile_type: str = "software_engineer_cn") -> dict:
    """Get a test resume profile"""
    return RESUME_SAMPLES.get(profile_type, RESUME_SAMPLES["software_engineer_cn"])


def get_edge_case(case_name: str) -> any:
    """Get an edge case test data"""
    return EDGE_CASES.get(case_name)
