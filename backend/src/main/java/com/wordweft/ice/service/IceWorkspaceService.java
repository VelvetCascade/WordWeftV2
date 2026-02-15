package com.wordweft.ice.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.ice.model.*;
import com.wordweft.ice.repository.IceWorkspaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class IceWorkspaceService {
    @Autowired
    private IceWorkspaceRepository workspaceRepository;

    @Autowired
    private BookRepository bookRepository;

    public IceWorkspace getOrCreateWorkspace(String userId, String bookId) {
        return workspaceRepository.findByOwnerUserIdAndBookId(userId, bookId)
                .orElseGet(() -> seedWorkspace(userId, bookId));
    }

    public IceWorkspace updateManuscript(String userId, String bookId, String manuscriptText, String writingMode) {
        IceWorkspace workspace = getOrCreateWorkspace(userId, bookId);
        workspace.setManuscriptText(manuscriptText == null ? "" : manuscriptText);
        if ("analysis".equals(writingMode) || "creation".equals(writingMode)) {
            workspace.setWritingMode(writingMode);
        }
        workspace.setMentions(extractMentions(workspace));
        workspace.setNarrativeSignals(computeSignals(workspace));
        workspace.setUpdatedAt(Instant.now());
        return workspaceRepository.save(workspace);
    }

    public IceWorkspace addEntity(String userId, String bookId, StoryBibleEntity entity) {
        IceWorkspace workspace = getOrCreateWorkspace(userId, bookId);
        if (entity.getId() == null || entity.getId().isBlank()) {
            entity.setId("ent-" + UUID.randomUUID());
        }
        entity.setProjectId(bookId);
        workspace.getEntities().add(entity);
        workspace.setMentions(extractMentions(workspace));
        workspace.setUpdatedAt(Instant.now());
        return workspaceRepository.save(workspace);
    }

    public IceWorkspace addFeedback(String userId, String bookId, FeedbackInsight insight) {
        IceWorkspace workspace = getOrCreateWorkspace(userId, bookId);
        if (insight.getId() == null || insight.getId().isBlank()) {
            insight.setId("fb-" + UUID.randomUUID());
        }
        workspace.getFeedbackInsights().add(insight);
        workspace.setNarrativeSignals(computeSignals(workspace));
        workspace.setUpdatedAt(Instant.now());
        return workspaceRepository.save(workspace);
    }

    public String exportPackage(String userId, String bookId, String format) {
        IceWorkspace workspace = getOrCreateWorkspace(userId, bookId);
        Book book = bookRepository.findById(bookId).orElse(null);
        String title = book != null ? book.getTitle() : "Untitled";
        return "EXPORT_FORMAT=" + format + "\n" +
                "TITLE=" + title + "\n" +
                "MODE=" + workspace.getWritingMode() + "\n" +
                "ENTITY_COUNT=" + workspace.getEntities().size() + "\n" +
                "FEEDBACK_COUNT=" + workspace.getFeedbackInsights().size() + "\n" +
                "MANUSCRIPT=\n" + workspace.getManuscriptText();
    }

    private IceWorkspace seedWorkspace(String userId, String bookId) {
        IceWorkspace workspace = new IceWorkspace();
        workspace.setOwnerUserId(userId);
        workspace.setBookId(bookId);

        StoryBibleEntity protagonist = new StoryBibleEntity();
        protagonist.setId("ent-protagonist");
        protagonist.setProjectId(bookId);
        protagonist.setType("character");
        protagonist.setName("Protagonist");
        protagonist.setSummary("Primary POV character for this manuscript.");
        protagonist.getTraits().add("driven");
        workspace.getEntities().add(protagonist);

        StoryTimelineEvent inciting = new StoryTimelineEvent();
        inciting.setId("timeline-1");
        inciting.setLabel("Inciting Incident");
        inciting.setSummary("A catalytic event that disrupts the status quo.");
        inciting.setSequence(1);
        workspace.getTimelineEvents().add(inciting);

        workspace.setNarrativeSignals(computeSignals(workspace));
        return workspaceRepository.save(workspace);
    }

    private List<ManuscriptMention> extractMentions(IceWorkspace workspace) {
        List<ManuscriptMention> results = new ArrayList<>();
        String text = workspace.getManuscriptText() == null ? "" : workspace.getManuscriptText();
        String lower = text.toLowerCase();

        for (StoryBibleEntity entity : workspace.getEntities()) {
            List<String> terms = new ArrayList<>();
            if (entity.getName() != null && !entity.getName().isBlank()) terms.add(entity.getName());
            terms.addAll(entity.getAliases());
            for (String term : terms) {
                if (term == null || term.isBlank()) continue;
                String needle = term.toLowerCase();
                int index = lower.indexOf(needle);
                while (index >= 0) {
                    ManuscriptMention mention = new ManuscriptMention();
                    mention.setId("mention-" + UUID.randomUUID());
                    mention.setChapterId("draft");
                    mention.setEntityId(entity.getId());
                    mention.setStartOffset(index);
                    mention.setEndOffset(index + needle.length());
                    mention.setConfidence(0.9);
                    int left = Math.max(0, index - 24);
                    int right = Math.min(text.length(), index + needle.length() + 24);
                    mention.setContextSnippet(text.substring(left, right));
                    results.add(mention);
                    index = lower.indexOf(needle, index + needle.length());
                }
            }
        }
        return results;
    }

    private List<NarrativeSignalPoint> computeSignals(IceWorkspace workspace) {
        int words = workspace.getManuscriptText() == null ? 0 : workspace.getManuscriptText().trim().isEmpty() ? 0 : workspace.getManuscriptText().trim().split("\\s+").length;
        int feedbackPressure = workspace.getFeedbackInsights().size() * 4;

        List<NarrativeSignalPoint> signals = new ArrayList<>();
        NarrativeSignalPoint pacing = new NarrativeSignalPoint();
        pacing.setChapterId("draft");
        pacing.setLabel("Pacing");
        pacing.setValue(Math.max(15, Math.min(95, 30 + (words / 25) - feedbackPressure)));
        signals.add(pacing);

        NarrativeSignalPoint sentiment = new NarrativeSignalPoint();
        sentiment.setChapterId("draft");
        sentiment.setLabel("Sentiment");
        sentiment.setValue(Math.max(10, Math.min(90, 50 + workspace.getEntities().size() * 3 - feedbackPressure / 2)));
        signals.add(sentiment);

        return signals;
    }
}
