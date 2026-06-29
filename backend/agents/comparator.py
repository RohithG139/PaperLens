import logging
import json

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser

from models.paper import Paper, PaperSummary, ComparisonResult
from config import settings

logger = logging.getLogger(__name__)


class ComparatorAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )
        self.parser = JsonOutputParser()

    async def compare_papers(
        self, papers: list[Paper], summaries: list[PaperSummary]
    ) -> ComparisonResult:
        logger.info(f"Comparing {len(papers)} papers")

        summary_map = {s.paperId: s for s in summaries}

        papers_block = ""
        for i, paper in enumerate(papers, start=1):
            summary = summary_map.get(paper.paperId)
            authors = (
                ", ".join(a.name for a in paper.authors) if paper.authors else "Unknown"
            )
            year = str(paper.year) if paper.year else "Unknown"
            citations = str(paper.citationCount)

            methodology = summary.methodology if summary else "Not available"
            results = summary.results if summary else "Not available"
            limitations = summary.limitations if summary else "Not available"

            papers_block += f"""
Paper {i}: {paper.title}
  Authors: {authors}
  Year: {year}
  Citations: {citations}
  Methodology: {methodology}
  Results: {results}
  Limitations: {limitations}
"""

        prompt = f"""You are a research paper comparison expert. Compare the following {len(papers)} research papers and return a single valid JSON object with exactly these keys:

- comparisonTable: an object where each key is an aspect name and each value is an object mapping paper title to its value for that aspect. Include these aspects: methodology, results, dataset, performance, limitations, year, citations.
- similarities: a list of strings describing shared characteristics across all papers.
- differences: a list of strings describing key differences between the papers.
- recommendation: a string explaining which paper is best suited for most use cases and why.

Return ONLY valid JSON with no additional text, markdown, or code fences.

Papers to compare:
{papers_block}"""

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

            comparison_table = parsed.get("comparisonTable", {})
            similarities = parsed.get("similarities", [])
            differences = parsed.get("differences", [])
            recommendation = parsed.get("recommendation", "No recommendation available.")

            logger.info(f"Comparison complete for {len(papers)} papers")
            return ComparisonResult(
                papers=papers,
                comparisonTable=comparison_table,
                similarities=similarities,
                differences=differences,
                recommendation=recommendation,
            )

        except Exception as e:
            logger.error(f"Error comparing papers: {e}")

            fallback_table: dict = {
                "year": {},
                "citations": {},
                "methodology": {},
                "results": {},
                "dataset": {},
                "performance": {},
                "limitations": {},
            }
            for paper in papers:
                summary = summary_map.get(paper.paperId)
                title = paper.title
                fallback_table["year"][title] = str(paper.year) if paper.year else "Unknown"
                fallback_table["citations"][title] = str(paper.citationCount)
                fallback_table["methodology"][title] = (
                    summary.methodology if summary else "Not available"
                )
                fallback_table["results"][title] = (
                    summary.results if summary else "Not available"
                )
                fallback_table["dataset"][title] = "Not available"
                fallback_table["performance"][title] = "Not available"
                fallback_table["limitations"][title] = (
                    summary.limitations if summary else "Not available"
                )

            return ComparisonResult(
                papers=papers,
                comparisonTable=fallback_table,
                similarities=["Comparison could not be fully generated due to an error."],
                differences=["Please retry or check individual paper summaries."],
                recommendation="Recommendation unavailable due to an error.",
            )
