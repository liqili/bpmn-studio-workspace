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
    private final BpmnValidatorService validatorService;

    public BpmnAiEngineService(
            BpmnModifierAgent agent,
            ContentRetriever contentRetriever,
            BpmnValidatorService validatorService
    ) {
        this.agent = agent;
        this.contentRetriever = contentRetriever;
        this.validatorService = validatorService;
    }

    public String executeXmlMutation(String currentXml, String userRequest) {

        List<Content> retrievedRules = contentRetriever.retrieve(new Query(userRequest));

        String information = retrievedRules.stream()
                .map(c -> c.textSegment().text())
                .collect(Collectors.joining("\n\n"));

        if (information.trim().isEmpty()) {
            information = "No specific corporate compliance or naming rules found for this operation.";
        }

        String mutatedXml = this.agent.modifyWorkflow(information, currentXml, userRequest);

        // 🔥 VALIDATE BEFORE RETURN
        validatorService.validate(mutatedXml);

        return mutatedXml;
    }
}