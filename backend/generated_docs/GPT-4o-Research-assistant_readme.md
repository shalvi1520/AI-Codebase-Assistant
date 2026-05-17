# GPT-4 Research Assistant
[![Python](https://img.shields.io/badge/Python-10_functions-3776AB.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-4D6975.svg)](https://opensource.org/licenses/MIT)

## Overview
The GPT-4 Research Assistant is a Python-based project designed to aid researchers in gathering and processing academic papers from arXiv. It utilizes the GPT-4 model to provide intelligent assistance in retrieving and summarizing research papers. The project aims to streamline the research process by automating tasks such as paper retrieval, PDF downloading, and text extraction.

## Features
* Retrieve arXiv papers using the `get_arxiv_papers` function from `arxiv_tools.py`
* Interact with the GPT-4 model using functions like `add_message`, `get_gpt_response`, and `get_completion` from `gpt_tools.py`
* Sanitize folder names and create directories for organizing papers using `sanitize_folder_name` and `create_papers_directory` from `main.py`
* Download PDFs and extract text from them using `download_pdf` from `main.py` and `extract_text_from_pdf` from `pdf_tools.py`

## Tech Stack
* **Language:** Python (10 functions)
* **Libraries:** (inferred) `arxiv` for paper retrieval, `gpt-4` for AI assistance, `PyPDF2` or similar for PDF processing
* **Frameworks:** (inferred) possibly `requests` for HTTP requests, `os` for file system operations

## Project Structure
The project consists of the following files:
```markdown
- arxiv_tools.py: contains functions for retrieving arXiv papers
- gpt_tools.py: contains functions for interacting with the GPT-4 model
- main.py: contains the main entry point and functions for paper organization and PDF processing
- pdf_tools.py: contains functions for extracting text from PDFs
```

## Getting Started
To get started with the GPT-4 Research Assistant, follow these steps:
1. Clone the repository: `git clone https://github.com/Memo/GPT-4o-Research-assistant.git`
2. Install required libraries: `pip install -r requirements.txt` (assuming a `requirements.txt` file is present)
3. Set up your GPT-4 API credentials (inferred, actual steps may vary)
4. Run the main script: `python main.py`

## API Reference
No explicit API endpoints are detected, but the project likely uses APIs from arXiv and GPT-4. Refer to the respective API documentations for more information.

## Architecture
The project's architecture can be visualized as follows:
```markdown
+---------------+
|  arxiv_tools  |
+---------------+
           |
           |
           v
+---------------+
|  gpt_tools    |
+---------------+
           |
           |
           v
+---------------+
|  main.py      |
|  (paper      |
|   organization) |
+---------------+
           |
           |
           v
+---------------+
|  pdf_tools    |
+---------------+
```
The `main.py` script serves as the central component, orchestrating the interaction between the arXiv paper retrieval, GPT-4 model, and PDF processing functions.

## Contributing
Contributions are welcome! To contribute to the GPT-4 Research Assistant, please:
1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Submit a pull request with a clear description of your changes
4. Ensure your code adheres to the project's coding standards and is thoroughly tested

## License
[![License](https://img.shields.io/badge/License-MIT-4D6975.svg)](https://opensource.org/licenses/MIT)
This project is licensed under the MIT License. See the LICENSE file for details.