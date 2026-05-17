# Function Documentation

*Auto-generated for `GPT-4o-Research-assistant`*


---

## 📄 `arxiv_tools.py`


### `get_arxiv_papers` 🟢 complexity: 3

**Purpose:** Retrieves a list of arXiv papers matching a given search query.

**Parameters:**
- `query` (str): The search query to use when searching arXiv.
- `max_results` (int): The maximum number of results to return (default: 10).

**Returns:** A list of arXiv papers matching the search query.

**Side Effects:** Prints search progress and results to the console, raises an exception if an error occurs.

**Complexity Note:** This function has a low cyclomatic complexity score of 3, indicating that it is relatively simple and easy to test and maintain.

**Example Usage:**
```python
papers = get_arxiv_papers("machine learning", max_results=20)
```


---

## 📄 `gpt_tools.py`


### `__init__` 🟢 complexity: 2

**Purpose:** Initializes the object with a system message and optionally sets the OpenAI model.

**Parameters:**
- `sys_message` (str): The system message to be sent to the OpenAI model.
- `model` (str): The OpenAI model to use (default is 'gpt-4o').

**Returns:** None

**Side Effects:** Initializes an OpenAI client using the provided API key, prints initialization status to the console, and raises an exception if initialization fails.

**Complexity Note:** This function has a low cyclomatic complexity score of 2, indicating that it is relatively simple and easy to test and maintain.

**Example Usage:**
```python
from gpt_tools import GPTTools  # Assuming GPTTools is the class containing this __init__ method

gpt = GPTTools("Hello, I'm a system message", model='gpt-4o')
```


### `add_message` 🟢 complexity: 1

**Purpose:** Adds a new message to the internal message list with the specified role and content.

**Parameters:**
- `self` (object): The instance of the class this method belongs to.
- `role` (str): The role of the message.
- `content` (str): The content of the message.

**Returns:** None

**Side Effects:** Prints a message to the console indicating the addition of a new message.

**Complexity Note:** This function has a cyclomatic complexity of 1, indicating a low risk of bugs and making it easy to test and maintain.

**Example Usage:**
```python
# Create an instance of the class
obj = MyClass()

# Add a new message
obj.add_message('admin', 'Hello, world!')
```


### `get_gpt_response` 🟢 complexity: 4

**Purpose:** Retrieves a response from the OpenAI GPT model based on user input.

**Parameters:**
- `user_input` (str): The input provided by the user to generate a response.

**Returns:** The generated response from the OpenAI GPT model.

**Side Effects:** Prints progress messages to the console, adds messages to the internal state, and raises an exception if an error occurs.

**Complexity Note:** This function has a cyclomatic complexity of 4, indicating a low risk of code duplication and maintainability issues. However, it may still benefit from additional testing to ensure robustness in error handling.

**Example Usage:**
```python
# Brief example showing how to call this function
await get_gpt_response("What is the weather like today?")
```


### `get_completion` 🟢 complexity: 1

**Purpose:** Retrieves a GPT completion response for the given user input.

**Parameters:**
- `user_input` (str): The user's input to be completed by the GPT model.

**Returns:** The GPT completion response.

**Side Effects:** Asynchronous I/O operation to retrieve the GPT response.

**Complexity Note:** This function has a low cyclomatic complexity score of 1, indicating a simple and predictable code path, which reduces the risk of bugs and makes it easier to test and maintain.

**Example Usage:**
```python
completion_response = get_completion("User input to be completed")
print(completion_response)
```


---

## 📄 `main.py`


### `sanitize_folder_name` 🟢 complexity: 2

**Purpose:** Sanitizes a folder name by removing invalid characters, replacing spaces, and limiting its length.

**Parameters:**
- `name` (str): The folder name to be sanitized.
- `max_length` (int): The maximum allowed length of the sanitized folder name (default: 30).

**Returns:** The sanitized folder name as a string.

**Side Effects:** None.

**Complexity Note:** This function has a cyclomatic complexity of 2, indicating a low risk of bugs and making it relatively easy to test and maintain.

**Example Usage:**
```python
print(sanitize_folder_name("example folder with spaces and invalid chars"))  # Output: "example_folder_with_spaces_and_invalid_chars"
print(sanitize_folder_name("very long folder name that needs truncation", max_length=20))  # Output: "very_long_folder_name"
```


### `create_papers_directory` 🟢 complexity: 2

**Purpose:** Creates a directory for papers based on a given search term.

**Parameters:**
- `search_term` (str): The term used to create the directory name.

**Returns:** The path to the newly created directory.

**Side Effects:** Creates a new directory, prints success or error messages to the console.

**Complexity Note:** This function has a low cyclomatic complexity score of 2, indicating that it has a simple control flow and is relatively easy to test and maintain.

**Example Usage:**
```python
# Create a directory for papers based on the search term "python programming"
directory_path = create_papers_directory("python programming")
print(directory_path)
```


### `download_pdf` 🟢 complexity: 3

**Purpose:** Downloads a PDF file from a specified URL and saves it to a local file.

**Parameters:**
- `url` (str): The URL of the PDF file to download.
- `filename` (str): The desired filename for the downloaded PDF.
- `folder_path` (str): The path to the folder where the PDF will be saved.

**Returns:** The full path to the saved PDF file.

**Side Effects:** Writes the downloaded PDF to a local file, prints status messages to the console.

**Complexity Note:** This function has a low cyclomatic complexity score of 3, indicating that it is relatively simple and easy to test and maintain.


### `main` 🔴 complexity: 12

**Purpose:** The `main` function performs a research iteration by searching for papers on ArXiv, asking a GPT model to choose a paper, and returning the chosen paper's details.

**Parameters:**
- `search_term` (str): The term to search for papers on ArXiv.
- `chosen_paper` (Paper): The previously chosen paper, if any.

**Returns:** A tuple containing the search term and the chosen paper.

**Side Effects:** Prints various messages to the console, creates a directory for the search term, and makes a database call to get ArXiv papers.

**Complexity Note:** This function has a high cyclomatic complexity score of 12, indicating a higher risk of bugs and making it more challenging to test and maintain.

**Example Usage:**
```python
search_term = "machine learning"
chosen_paper = None
search_term, chosen_paper = main(search_term, chosen_paper)
```


---

## 📄 `pdf_tools.py`


### `extract_text_from_pdf` 🟢 complexity: 5

**Purpose:** Extracts text from a PDF file located at the specified path.

**Parameters:**
- `pdf_path` (str): Path to the PDF file to extract text from.

**Returns:** The extracted text as a string.

**Side Effects:** Reads the PDF file, prints progress and error messages to the console.

**Complexity Note:** This function has a low cyclomatic complexity score of 5, indicating it is relatively simple and easy to test and maintain.

**Example Usage:**
```python
import pdf_tools

pdf_text = pdf_tools.extract_text_from_pdf('/path/to/example.pdf')
print(pdf_text)
```
