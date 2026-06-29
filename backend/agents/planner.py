import json
import logging
from typing import TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from config import settings

logger = logging.getLogger(__name__)


class PlannerOutput(TypedDict):
    intent: str
    steps: list[str]
    agents_needed: list[str]
    search_queries: list[str]


SYSTEM_PROMPT = """You are a research planning agent. Analyze the user query and create a structured execution plan.

Classify the intent as one of:
- search_only: User wants to find/retrieve papers
- summarize: User wants a summary of a paper or topic
- compare: User wants to compare multiple papers or methods
- qa: User wants a specific question answered from research literature

Return ONLY valid JSON with this exact structure:
{
  "intent": "<one of: search_only, summarize, compare, qa>",
  "steps": ["<step 1>", "<step 2>", ...],
  "agents_needed": ["<agent name>", ...],
  "search_queries": ["<query 1>", "<query 2>", ...]
}

Available agents: retriever, summarizer, comparator, qa_agent
Guidelines:
- steps: ordered list of actions to fulfill the request
- agents_needed: subset of available agents required
- search_queries: 1-3 targeted search strings"""


class PlannerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
        )
        self.parser = JsonOutputParser()
        self.prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=SYSTEM_PROMPT),
            ("human", "{query}"),
        ])
        self.chain = self.prompt | self.llm | self.parser

    async def plan(self, query: str) -> PlannerOutput:
        logger.info("PlannerAgent.plan: query=%s", query[:120])
        try:
            result: dict = await self.chain.ainvoke({"query": query})
            intent = str(result.get("intent", "search_only"))
            if intent not in {"search_only", "summarize", "compare", "qa"}:
                intent = "search_only"
            output: PlannerOutput = {
                "intent": intent,
                "steps": [str(s) for s in result.get("steps", [])],
                "agents_needed": [str(a) for a in result.get("agents_needed", [])],
                "search_queries": [str(q) for q in result.get("search_queries", [query])],
            }
            logger.info("Plan: intent=%s steps=%d", output["intent"], len(output["steps"]))
            return output
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse planner JSON: %s", exc)
            return _fallback_plan(query)
        except Exception as exc:
            logger.error("PlannerAgent error: %s", exc, exc_info=True)
            return _fallback_plan(query)


def _fallback_plan(query: str) -> PlannerOutput:
    return {
        "intent": "search_only",
        "steps": ["Search for relevant papers", "Return results to user"],
        "agents_needed": ["retriever"],
        "search_queries": [query],
    }
