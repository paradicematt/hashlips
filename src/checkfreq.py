import json
import re
from collections import Counter

# Define the trait type you want to track (e.g., "Faction" or "Hat")
trait_type_to_track = "Weapon"

# Load the JSON file
with open('_metadata.json', 'r') as file:
    data = json.load(file)

# Extract the values and associated editions of the specific trait type
values = []
editions_dict = {}
for item in data:
    edition = item.get('edition')
    for attribute in item['attributes']:
        if attribute['trait_type'] == trait_type_to_track:
            # Extract the part of the value before the '{'
            clean_value = re.split(r'{', attribute['value'])[0].strip()
            values.append(clean_value)
            
            # Track editions for each value
            if clean_value not in editions_dict:
                editions_dict[clean_value] = []
            editions_dict[clean_value].append(edition)

# Calculate the frequency of each value
frequency = Counter(values)
total_count = sum(frequency.values())

# Output the results with edition numbers
print(f"Frequency of each value for '{trait_type_to_track}':")
for value, count in frequency.items():
    percentage = (count / total_count) * 100
    # Limit the number of editions to display to 5
    editions_to_show = ','.join(map(str, editions_dict[value][:5]))
    print(f"{value}: {count} times ({percentage:.2f}%) - Editions: {editions_to_show}")
