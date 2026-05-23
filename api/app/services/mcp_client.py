import httpx
from typing import Any, Dict
from app.core.config import get_settings


class MCPClient:
    """Client for communicating with MCP servers."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.MCP_SERVER_URL
        self.timeout = 30.0

    async def _call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Call an MCP tool via HTTP."""
        url = f"{self.base_url}/mcp/{server_name}/{tool_name}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=arguments)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                raise MCPError(f"MCP call failed: {e}")

    async def parse_resume(
        self,
        file_path: str,
        file_content: bytes | None = None,
    ) -> Dict[str, Any]:
        """Parse resume using MCP Resume Analyzer."""
        arguments = {
            "file_path": file_path,
        }

        if file_content:
            arguments["file_content"] = file_content

        return await self._call_tool(
            server_name="resume-analyzer",
            tool_name="parse_resume",
            arguments=arguments,
        )

    async def parse_jd(self, content: str) -> Dict[str, Any]:
        """Parse job description using MCP JD Parser."""
        return await self._call_tool(
            server_name="jd-parser",
            tool_name="parse_jd",
            arguments={"content": content},
        )

    async def match_resume_to_jd(
        self,
        resume_data: Dict[str, Any],
        jd_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Match resume to job description using MCP Job Matcher."""
        return await self._call_tool(
            server_name="job-matcher",
            tool_name="match",
            arguments={
                "resume": resume_data,
                "jd": jd_data,
            },
        )

    async def generate_interview_prep(
        self,
        resume_data: Dict[str, Any],
        jd_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate interview preparation materials."""
        return await self._call_tool(
            server_name="job-matcher",
            tool_name="interview_prep",
            arguments={
                "resume": resume_data,
                "jd": jd_data,
            },
        )

    async def optimize_resume(
        self,
        resume_data: Dict[str, Any],
        jd_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Optimize resume for specific job description."""
        return await self._call_tool(
            server_name="job-matcher",
            tool_name="optimize_resume",
            arguments={
                "resume": resume_data,
                "jd": jd_data,
            },
        )


class MCPError(Exception):
    """MCP client error."""

    pass


# Singleton instance
mcp_client = MCPClient()
