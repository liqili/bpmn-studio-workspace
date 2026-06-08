package com.engineering.starter.service;

import com.engineering.starter.agent.BpmnModifierAgent;
import com.engineering.starter.util.BpmnXmlValidator;
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

    public BpmnAiEngineService(
            BpmnModifierAgent agent,
            ContentRetriever contentRetriever
    ) {
        this.agent = agent;
        this.contentRetriever = contentRetriever;
    }

    public String executeXmlMutation(String currentXml, String userRequest) {

        List<Content> retrievedRules = contentRetriever.retrieve(new Query(userRequest));

        String information = retrievedRules.stream()
                .map(c -> c.textSegment().text())
                .collect(Collectors.joining("\n\n"));

        if (information.trim().isEmpty()) {
            information = "No specific rules found.";
        }

        // STEP 1: LLM generates process-only BPMN
        String rawXml = agent.modifyWorkflow(information, currentXml, userRequest);

        // STEP 2: remove BPMNDI completely
        String processOnlyXml = BpmnXmlValidator.stripDiagramSection(rawXml);

        // STEP 3: OPTIONAL validation (recommended)
        BpmnXmlValidator.validate(processOnlyXml);

        // STEP 4: return process-only XML
        return processOnlyXml;
    }
}