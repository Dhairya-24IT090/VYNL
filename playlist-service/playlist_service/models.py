from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class BaseStrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class CreatePlaylistDTO(BaseStrictModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field("", max_length=500)
    is_collaborative: bool = False
    draft_id: Optional[str] = None

class UpdatePlaylistDTO(BaseStrictModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_collaborative: Optional[bool] = None

class AddItemDTO(BaseStrictModel):
    song_id: str
    after_item_id: Optional[str] = None

class MoveItemDTO(BaseStrictModel):
    after_item_id: Optional[str] = None

class ReplaceItemsDTO(BaseStrictModel):
    song_ids: List[str] = Field(..., max_length=500)

class CreateInviteDTO(BaseStrictModel):
    role: str = Field(..., pattern="^(editor|viewer)$")

class RedeemInviteDTO(BaseStrictModel):
    token: str

class AdjustDraftDTO(BaseStrictModel):
    title: Optional[str] = None
    items: List[dict]
