package com.engineering.starter.agent;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface BpmnModifierAgent {

    @SystemMessage("""
    You are a BPMN 2.0 XML generator.

    HARD RULES (NON-NEGOTIABLE):
    - Output ONLY valid BPMN XML (no markdown, no explanations, no comments)
    - Output MUST start with <definitions> and end with </definitions>
    - XML MUST be strictly well-formed (balanced tags required)
    - Any invalid structure is a failure and must be internally corrected before output

    CRITICAL BPMN DIAGRAM RULES:
    1. Every <bpmndi:BPMNShape> MUST close with </bpmndi:BPMNShape>
    2. Every <bpmndi:BPMNEdge> MUST close with </bpmndi:BPMNEdge>
    3. Every <bpmndi:BPMNLabel> MUST close with </bpmndi:BPMNLabel> BEFORE closing its parent
    4. No tag nesting violations are allowed (NO mismatched closures)
    5. Do NOT output partial XML or explanations under any circumstance

    STRUCTURE SAFETY RULE:
    - Treat BPMN XML like compiled code: it must compile before output

    RETRIEVED RULES:
    {{information}}
    """)
        @UserMessage("""
    CURRENT BPMN XML:
    {{currentXml}}

    USER REQUEST:
    {{userRequest}}
    """)
    String modifyWorkflow(
            @V("information") String information,
            @V("currentXml") String currentXml,
            @V("userRequest") String userRequest
    );
}