## Phase 1: Data Model & Schema Updates

**Goal:** Establish a relational hierarchy for study materials so Planner data can be consumed by the Document Uploader and AI Agents.

1.  **Introduce Subject Model/Table:**
    - **Required Fields:** Unique Identifier, User Association (Foreign Key), Name (String), Timestamps.
2.  **Introduce Chapter Model/Table:**
    - **Required Fields:** Unique Identifier, Subject Association (Foreign Key), Name (String), Timestamps.
3.  **Update Document Model/Table:**
    - **New Requirement:** Add a Chapter Association (Foreign Key).
    - **Constraint:** This must be a required field. A document cannot be saved without being linked to a chapter.
4.  **Data Fetching Logic:** Ensure your database utility functions or ORM queries are updated to fetch Subjects with their nested Chapters and linked Documents.

## Phase 2: Backend Logic & Upload Constraints

**Goal:** Handle the new hierarchy and enforce strict upload rules.

1.  **Subject/Chapter Handlers:** Implement the backend logic required to create new subjects/chapters (based on Planner agent output) and fetch the user's nested hierarchy.
2.  **Refactor Document Upload Handler:**
    - Extract the `Chapter ID` from the incoming upload request payload.
    - **Validation:** If the `Chapter ID` is missing, reject the request immediately with an error.
    - Save the document and link it to the provided `Chapter ID`.
3.  **Refactor Document Fetching Logic:** Update the logic that returns user documents so the payload is grouped hierarchically (Subject -> Chapter -> Documents).

## Phase 3: Frontend Upload UI & State Management

**Goal:** Prevent orphaned documents by guiding the user through a strict selection flow before uploading.

1.  **Global State:** Update the frontend state management to store and update the user's nested Subjects and Chapters.
2.  **Upload Interface Refactor:**
    - Implement two dependent selection inputs: "Select Subject" and "Select Chapter".
    - **Logic:** The "Select Chapter" input must be disabled until a Subject is selected.
    - **Constraint:** Disable the actual file upload dropzone/button completely if no Subject and Chapter are selected. Display a prompt asking the user to select them first.

## Phase 4: Active Context Menu (Agent Synchronization)

**Goal:** Allow users to build a specific context window by selecting multiple slides/documents across different chapters.

1.  **Interactive Context Selector UI:**
    - Build a hierarchical menu (e.g., an accordion or tree view) displaying: Subject -> Chapter -> Checkboxes for specific Documents.
    - Users must be able to check/uncheck multiple documents.
2.  **State Update:** Track the selected materials in an array of `activeDocumentIds`.
3.  **API Payload Refactor:** Update the frontend calls for the Tutor chat and Evaluator quiz generation to send the array of `activeDocumentIds` instead of a single document ID.
4.  **RAG Engine Refactor:** Update the backend vector search function. It must accept an array of document IDs and filter the text chunks, performing its similarity search _only_ on the selected documents.

## Phase 5: Evaluator Quiz Real-Time Feedback Refactor

**Goal:** Provide immediate validation and explanations during the quiz without removing the final review screen.

1.  **Update LLM Evaluator Prompt:**
    - Modify the prompt instructions for generating the quiz JSON.
    - **Requirement:** The LLM must include an `explanation` or `reason` field for the correct answer (or for each option) directly within the generated question schema.
2.  **Refactor Quiz UI:**
    - When the user selects an answer, immediately lock the question to prevent changing answers.
    - Visually highlight the correct answer (e.g., green) and the user's incorrect answer (e.g., red) if they were wrong.
    - Render the explanation/reason fetched from the JSON payload directly below the options.
3.  **Final Review Screen:** Keep the existing end-of-quiz review screen intact as a summary of their performance.
