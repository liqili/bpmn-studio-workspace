package com.engineering.starter.service;

import com.engineering.starter.agent.BpmnModifierAgent;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BpmnAiEngineService {

    private final BpmnModifierAgent agent;
    private final ContentRetriever contentRetriever;

    public BpmnAiEngineService(BpmnModifierAgent agent, ContentRetriever contentRetriever) {
        this.agent = agent;
        this.contentRetriever = contentRetriever;
    }

    public String executeXmlMutation(String currentXml, String userRequest) {
        // 1. Query the vector database using ONLY the natural language string
        List<Content> retrievedRules = contentRetriever.retrieve(new Query(userRequest));

        // 2. Flatten the retrieved data chunks into a single text block
        String information = retrievedRules.stream()
                .map(content -> content.textSegment().text())
                .collect(Collectors.joining("\n\n"));

        // 3. Fallback Guardrail: If your Postgres table is empty or has no matches,
        // provide a default string so the template engine never crashes again.
        if (information.trim().isEmpty()) {
            information = "No specific corporate compliance or naming rules found for this operation.";
        }

        // 4. Send all three parameters cleanly down to OpenAI
        return this.agent.modifyWorkflow(information, currentXml, userRequest);
    }
}