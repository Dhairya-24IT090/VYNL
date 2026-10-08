from bson import ObjectId
from typing import Any, Union, Dict, List

def serialize_mongo_doc(doc: Union[Dict, List, Any]) -> Any:
    """
    Recursively transforms MongoDB documents to JSON-serializable dictionaries.
    Converts ObjectId instances to str and drops raw internal _id when key exists.
    """
    if isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == "_id":
                continue
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, (dict, list)):
                result[k] = serialize_mongo_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc
