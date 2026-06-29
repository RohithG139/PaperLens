import logging
import asyncio
import uuid
from typing import TypedDict, Optional, Annotated

from langgraph.graph import StateGraph, START, END

from agents.planner import PlannerAgent
from agents.researcher import ResearcherAgent
from agents.summarizer import SummarizerAgent
from agents.comparator import ComparatorAgent
from agents.qa import QAAgent
from models.paper import Paper, PaperSummary, ComparisonResult
from database.mongodb import get_db

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    query: str
    userId: str
    question: Optional[str]
    intent: str
    steps: list[str]
    papers: list[dict]
    summaries: list[dict]
    comparison: Optional[dict]
    answer: Optional[str]
    error: Optional[str]
    currentStep: str
    executionId: str
    agentOutputs: dict


async def planner_node(state: AgentState) -> dict:
    logger.info(f"[{state['executionId']}] planner_node start")
    try:
        agent = PlannerAgent()
        result = await agent.plan(state["query"])
        return {
            "intent": result.get("intent", "search"),
            "steps": result.get("steps", []),
            "currentStep": "planner",
            "agentOutputs": {**state.get("agentOutputs", {}), "planner": result},
        }
    except Exception as e:
        logger.error(f"[{state['executionId']}] planner_node error: {e}")
        return {"error": str(e), "currentStep": "planner_error"}


async def researcher_node(state: AgentState) -> dict:
    logger.info(f"[{state['executionId']}] researcher_node start")
    try:
        agent = ResearcherAgent()
        papers = await agent.search_papers(state["query"], max_results=10)
        papers_dicts = [p.dict() if hasattr(p, "dict") else p for p in papers]
        return {
            "papers": papers_dicts,
            "currentStep": "researcher",
            "agentOutputs": {**state.get("agentOutputs", {}), "researcher": {"count": len(papers_dicts)}},
        }
    except Exception as e:
        logger.error(f"[{state['executionId']}] researcher_node error: {e}")
        return {"error": str(e), "currentStep": "researcher_error"}


async def summarizer_node(state: AgentState) -> dict:
    logger.info(f"[{state['executionId']}] summarizer_node start")
    try:
        agent = SummarizerAgent()
        raw_papers = state.get("papers", [])
        papers = [Paper(**p) if isinstance(p, dict) else p for p in raw_papers]
        summaries = await agent.summarize_papers(papers)
        summaries_dicts = [s.dict() if hasattr(s, "dict") else s for s in summaries]
        return {
            "summaries": summaries_dicts,
            "currentStep": "summarizer",
            "agentOutputs": {**state.get("agentOutputs", {}), "summarizer": {"count": len(summaries_dicts)}},
        }
    except Exception as e:
        logger.error(f"[{state['executionId']}] summarizer_node error: {e}")
        return {"error": str(e), "currentStep": "summarizer_error"}


async def comparator_node(state: AgentState) -> dict:
    logger.info(f"[{state['executionId']}] comparator_node start")
    try:
        agent = ComparatorAgent()
        raw_papers = state.get("papers", [])
        raw_summaries = state.get("summaries", [])
        papers = [Paper(**p) if isinstance(p, dict) else p for p in raw_papers]
        summaries = [PaperSummary(**s) if isinstance(s, dict) else s for s in raw_summaries]
        comparison = await agent.compare_papers(papers, summaries)
        comparison_dict = comparison.dict() if hasattr(comparison, "dict") else comparison
        return {
            "comparison": comparison_dict,
            "currentStep": "comparator",
            "agentOutputs": {**state.get("agentOutputs", {}), "comparator": comparison_dict},
        }
    except Exception as e:
        logger.error(f"[{state['executionId']}] comparator_node error: {e}")
        return {"error": str(e), "currentStep": "comparator_error"}


async def qa_node(state: AgentState) -> dict:
    logger.info(f"[{state['executionId']}] qa_node start")
    try:
        agent = QAAgent()
        question = state.get("question", "")
        raw_papers = state.get("papers", [])
        paper_ids = [p.get("id") or p.get("_id") for p in raw_papers if isinstance(p, dict)]
        answer = await agent.answer_question(question, paper_ids)
        return {
            "answer": answer,
            "currentStep": "qa",
            "agentOutputs": {**state.get("agentOutputs", {}), "qa": {"answer": answer}},
        }
    except Exception as e:
        logger.error(f"[{state['executionId']}] qa_node error: {e}")
        return {"error": str(e), "currentStep": "qa_error"}


async def end_node(state: AgentState) -> dict:
    logger.info(f"[{state['executionId']}] end_node assembling final output")
    final_output = {
        "executionId": state.get("executionId"),
        "query": state.get("query"),
        "userId": state.get("userId"),
        "intent": state.get("intent"),
        "steps": state.get("steps"),
        "papers": state.get("papers"),
        "summaries": state.get("summaries"),
        "comparison": state.get("comparison"),
        "answer": state.get("answer"),
        "error": state.get("error"),
        "agentOutputs": state.get("agentOutputs"),
    }
    return {"currentStep": "completed", "agentOutputs": {**state.get("agentOutputs", {}), "finalOutput": final_output}}


def route_after_summarizer(state: AgentState) -> str:
    if state.get("question"):
        return "qa_node"
    if state.get("intent") == "compare":
        return "comparator_node"
    return "end_node"


graph = StateGraph(AgentState)
graph.add_node("planner_node", planner_node)
graph.add_node("researcher_node", researcher_node)
graph.add_node("summarizer_node", summarizer_node)
graph.add_node("comparator_node", comparator_node)
graph.add_node("qa_node", qa_node)
graph.add_node("end_node", end_node)

graph.add_edge(START, "planner_node")
graph.add_edge("planner_node", "researcher_node")
graph.add_edge("researcher_node", "summarizer_node")
graph.add_conditional_edges(
    "summarizer_node",
    route_after_summarizer,
    {
        "qa_node": "qa_node",
        "comparator_node": "comparator_node",
        "end_node": "end_node",
    },
)
graph.add_edge("comparator_node", "end_node")
graph.add_edge("qa_node", "end_node")
graph.add_edge("end_node", END)

compiled = graph.compile()


async def run_workflow(query: str, userId: str, executionId: str, question: str = None) -> dict:
    initial_state: AgentState = {
        "query": query,
        "userId": userId,
        "question": question,
        "intent": "",
        "steps": [],
        "papers": [],
        "summaries": [],
        "comparison": None,
        "answer": None,
        "error": None,
        "currentStep": "init",
        "executionId": executionId,
        "agentOutputs": {},
    }

    logger.info(f"[{executionId}] run_workflow starting for user={userId}")

    try:
        final_state = await compiled.ainvoke(initial_state)
    except Exception as e:
        logger.error(f"[{executionId}] run_workflow graph error: {e}")
        final_state = {**initial_state, "error": str(e), "currentStep": "failed"}

    try:
        db = await get_db()
        await db["agent_executions"].update_one(
            {"executionId": executionId},
            {"$set": {**final_state, "executionId": executionId, "userId": userId}},
            upsert=True,
        )
    except Exception as e:
        logger.error(f"[{executionId}] MongoDB update error: {e}")

    return dict(final_state)
