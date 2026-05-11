from abc import ABC, abstractmethod
from typing import Generic, TypeVar


AgentInput = TypeVar("AgentInput")
AgentOutput = TypeVar("AgentOutput")


class BaseAgent(ABC, Generic[AgentInput, AgentOutput]):
    """Common contract for AI agents used by the backend."""

    name: str

    @abstractmethod
    async def run(self, agent_input: AgentInput) -> AgentOutput:
        """Execute the agent and return a typed result."""
