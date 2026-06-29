import asyncio
import logging
import json

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser

from models.paper import Paper, PaperSummary
from config import settings

logger = logging.getLogger(__name__)


class SummarizerAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )
        self.parser = JsonOutputParser()

    async def summarize_paper(self, paper: Paper) -> PaperSummary:
        logger.info(f"Summarizing paper: {paper.paperId} — {paper.title}")
        abstract = paper.abstract or "Abstract not available"
        authors = ", ".join(a.name for a in paper.authors) if paper.authors else "Unknown"
        year = str(paper.year) if paper.year else "Unknown"

        prompt = f"""You are a research paper analyst. Analyze the following paper and return a JSON object with exactly these keys:
- problemStatement: What problem does this paper address?
- methodology: What methods or approaches are used?
- results: What are the key findings or results?
- advantages: What are the strengths or contributions?
- limitations: What are the weaknesses or limitations?

Return ONLY valid JSON with these five keys and no other text.

Title: {paper.title}
Authors: {authors}
Year: {year}
Abstract: {abstract}"""

        try:
            response = await self.llm.ainvoke(prompt)
            raw = response.content

            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                start = raw.find("{")
                end = raw.rfind("}") + 1
                if start != -1 and end > start:
                    parsed = json.loads(raw[start:end])
                else:
                    raise ValueError("No valid JSON found in LLM response")

            return PaperSummary(
                paperId=paper.paperId,
                title=paper.title,
                problemStatement=parsed.get("problemStatement", "Not available"),
                methodology=parsed.get("methodology", "Not available"),
                results=parsed.get("results", "Not available"),
                advantages=parsed.get("advantages", "Not available"),
                limitations=parsed.get("limitations", "Not available"),
            )

        except Exception as e:
            logger.error(f"Error summarizing paper {paper.paperId}: {e}")
            return PaperSummary(
                paperId=paper.paperId,
                title=paper.title,
                problemStatement="Summary unavailable due to an error.",
                methodology="Summary unavailable due to an error.",
                results="Summary unavailable due to an error.",
                advantages="Summary unavailable due to an error.",
                limitations="Summary unavailable due to an error.",
            )

    async def summarize_papers(self, papers: list[Paper]) -> list[PaperSummary]:
        logger.info(f"Summarizing {len(papers)} papers with concurrency limit 3")
        semaphore = asyncio.Semaphore(3)

        async def _summarize_with_semaphore(paper: Paper) -> PaperSummary:
            async with semaphore:
                return await self.summarize_paper(paper)

        results = await asyncio.gather(
            *[_summarize_with_semaphore(p) for p in papers],
            return_exceptions=True,
        )

        summaries = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Exception for paper {papers[i].paperId}: {result}")
            else:
                summaries.append(result)

        logger.info(f"Successfully summarized {len(summaries)}/{len(papers)} papers")
        return summaries
