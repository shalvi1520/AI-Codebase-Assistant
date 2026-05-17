# Function Documentation

*Auto-generated for `heatmap_project`*


---

## 📄 `advanced.py`


### `fibonacci` 🟢 complexity: 2

**Purpose:** Calculates the nth number in the Fibonacci sequence.

**Parameters:**
- `n` (int): The position of the number in the Fibonacci sequence.

**Returns:** The nth number in the Fibonacci sequence.

**Side Effects:** None.

**Complexity Note:** This function has a low cyclomatic complexity score of 2, indicating a simple and predictable code path. This makes it easier to test and maintain.

**Example Usage:**
```python
print(fibonacci(10))  # Output: 55
```


### `complex_calculation` 🟢 complexity: 3

**Purpose:** Performs a complex calculation on input data, combining Fibonacci numbers with conditional operations.

**Parameters:**
- `data` (list): Input list of values to be processed.

**Returns:** A list of calculated values.

**Side Effects:** None.

**Complexity Note:** This function has a low cyclomatic complexity score of 3, indicating a low risk of bugs and making it easier to test and maintain.

**Example Usage:**
```python
result = complex_calculation([0.1, 0.6, 0.3, 0.8, 0.4])
print(result)
```


---

## 📄 `main.py`


### `main` 🟢 complexity: 1

**Purpose:** The main function processes a list of data, calculates statistics, and prints the results.

**Parameters:**
- `data` (list): A list of numbers to be processed.

**Returns:** None

**Side Effects:** Prints processed data and statistics to the console.

**Complexity Note:** This function has a low cyclomatic complexity score of 1, indicating a simple and straightforward implementation that is easy to test and maintain.

**Example Usage:**
```python
def main():
    data = [10, 20, 30, 40, 50, 60]
    processed = process_data(data)
    stats = calculate_statistics(processed)
    print("Processed Data:", processed)
    print("Statistics:", stats)
```


---

## 📄 `processing.py`


### `normalize` 🟢 complexity: 2

**Purpose:** Normalizes a list of numerical values to a range between 0 and 1.

**Parameters:**
- `data` (list): The list of numerical values to be normalized.

**Returns:** A list of normalized numerical values.

**Side Effects:** None.

**Complexity Note:** This function has a low cyclomatic complexity score of 2, indicating that it is relatively simple and easy to test and maintain.

**Example Usage:**
```python
data = [1, 2, 3, 4, 5]
normalized_data = normalize(data)
print(normalized_data)  # Output: [0.0, 0.25, 0.5, 0.75, 1.0]
```


### `filter_data` 🟢 complexity: 2

**Purpose:** Filters a list of data to include only values greater than 0.3.

**Parameters:**
- `data` (list): The input list of data to be filtered.

**Returns:** A new list containing only the values from the input list that are greater than 0.3.

**Side Effects:** None.

**Complexity Note:** This function has a low cyclomatic complexity score of 2, indicating that it is relatively simple and easy to test and maintain.

**Example Usage:**
```python
# Filter a list of numbers to include only values greater than 0.3
numbers = [0.1, 0.2, 0.4, 0.5, 0.6]
filtered_numbers = filter_data(numbers)
print(filtered_numbers)  # Output: [0.4, 0.5, 0.6]
```


### `process_data` 🟢 complexity: 1

**Purpose:** Processes input data by normalizing and filtering it.

**Parameters:**
- `data` (object): Input data to be processed.

**Returns:** Filtered data.

**Side Effects:** None.

**Complexity Note:** This function has a low cyclomatic complexity score of 1, indicating a simple and predictable code path. This makes it easier to test and maintain.

**Example Usage:**
```python
processed_data = process_data([1, 2, 3, 4, 5])
print(processed_data)
```


---

## 📄 `utils.py`


### `calculate_mean` 🟢 complexity: 1

**Purpose:** Calculates the mean of a given dataset.

**Parameters:**
- `data` (list): The input dataset for which the mean is to be calculated.

**Returns:** The calculated mean of the input dataset.

**Side Effects:** None.

**Complexity Note:** This function has a cyclomatic complexity of 1, indicating a low risk of bugs and ease of maintenance.

**Example Usage:**
```python
# Calculate the mean of a list of numbers
numbers = [1, 2, 3, 4, 5]
mean = calculate_mean(numbers)
print(mean)  # Output: 3.0
```


### `calculate_variance` 🟢 complexity: 2

**Purpose:** Calculates the variance of a given dataset.

**Parameters:**
- `data` (list): The input dataset for which to calculate the variance.

**Returns:** The variance of the input dataset.

**Side Effects:** None.

**Complexity Note:** This function has a low cyclomatic complexity score of 2, indicating that it is relatively simple and easy to test and maintain.

**Example Usage:**
```python
data = [1, 2, 3, 4, 5]
variance = calculate_variance(data)
print(variance)
```


### `calculate_statistics` 🟢 complexity: 1

**Purpose:** Calculates the mean and variance of a given dataset.

**Parameters:**
- `data` (list): Input dataset for which to calculate statistics.

**Returns:** A dictionary containing the mean and variance of the input data.

**Side Effects:** None.

**Complexity Note:** This function has a cyclomatic complexity of 1, indicating a low risk of bugs and making it easier to test and maintain.

**Example Usage:**
```python
import utils

data = [1, 2, 3, 4, 5]
stats = utils.calculate_statistics(data)
print(stats)  # Output: {'mean': 3.0, 'variance': 2.5}
```
