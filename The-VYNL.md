# <a id="_z8z1sbxo4uh7"></a>Introduction:

**VYNL** is an AI-powered music streaming platform designed to provide users with a highly personalized and interactive music experience. Unlike traditional music streaming platforms that primarily rely on predefined playlists and generic recommendation algorithms, VYNL focuses on understanding each user's individual music taste, listening patterns, preferences, and interactions with songs. The platform uses **Artificial Intelligence and Machine Learning (AI/ML)** to analyze user behavior and generate personalized music recommendations that evolve as the user continues to interact with the platform.

VYNL aims to make music discovery more intelligent and engaging by considering not only what a user listens to, but also how they interact with the music presented to them. User activities such as searching for songs, playing tracks, skipping songs, listening duration, playlist interactions, and other forms of engagement can contribute to building a better understanding of the user's preferences. This information is used to continuously improve future recommendations and provide a more personalized experience. In addition to AI-powered recommendations, VYNL combines intelligent playlist generation, collaborative music experiences, synchronized interactive lyrics, high-quality streaming and downloading, and personalized monthly listening insights into a single platform.

The core philosophy of VYNL is to create a **continuous personalization loop**, where the user's interaction with music helps the system understand their preferences, which in turn allows the system to provide better recommendations and a more tailored listening experience over time.

# <a id="_8474q2tdb6x4"></a>Features:

### <a id="_jw8jvf281hl1"></a>**1. AI-Assisted Queue Creation and Song Recommendation**

VYNL uses AI/ML to automatically generate a personalized queue of songs based on the user's listening behavior and preferences. When a user plays a song or playlist, the system analyzes relevant information such as the user's listening history, previously played songs, interactions, and the musical attributes of the current track. Once the current song or playlist finishes, the system presents a queue of AI-selected recommendations.

Each recommended song is accompanied by a **curated explanation** generated using an LLM, describing why that particular song was selected for the user. This makes the recommendation process more transparent and personalized rather than simply presenting a list of unexplained songs.

### <a id="_7ysfapdlu83f"></a>**2. AI-Assisted Playlist Suggestion and Creation**

VYNL allows users to create completely personalized playlists with the assistance of AI. Users can specify the **genres and artists** they are interested in and provide approximately **3–5 songs** that represent the desired mood, style, or direction of the playlist.

The AI model analyzes the user's selections and the characteristics of the provided songs to understand the intended mood and musical direction. It then generates a **custom-curated playlist from scratch**, selecting songs that align with the user's specified genres, artists, and reference tracks.

This allows users to create playlists based on a particular mood, activity, genre, or musical theme without manually searching for and adding every individual song.

### <a id="_a75il4rbyftt"></a>**3. Collaborative Playlists Between Users and AI**

VYNL supports **collaborative playlist creation**, allowing multiple users to contribute to the same playlist. Users can add, remove, or modify songs while building a playlist together.

AI can further assist the collaborative process by analyzing the combined preferences and contributions of the participating users and suggesting songs that are likely to appeal to the group. This creates a hybrid playlist-building experience where **multiple users and AI work together** to curate the final playlist.

### <a id="_9jj7083v06iu"></a>**4. Custom and Interactive Synchronized Lyrics**

VYNL provides an interactive lyrics experience where lyrics are synchronized with the music being played. The lyrics dynamically progress according to the song, allowing users to follow the currently playing section in real time.

The lyrics interface can also be customized visually. Users can select from a collection of **pre-designed lyric backdrops** or upload their own preferred image to use as the background. This allows the lyrics screen to become more personalized and visually engaging rather than functioning as a simple text display.

The combination of synchronized lyrics and customizable backgrounds provides a more immersive experience while listening to music.

### <a id="_3sdt8v9whj79"></a>**5. High-Quality Music Streaming and Download**

VYNL provides users with **high-quality music streaming** designed to deliver a smooth listening experience. The platform's storage and streaming architecture allows songs to be efficiently acquired, stored, and delivered to users.

Songs that are acquired for the first time are stored in the platform's persistent audio storage system. A unique file reference is maintained for each song, allowing the platform to retrieve and stream previously acquired songs without repeatedly fetching them from the external source.

Where supported, users can also **download songs for offline or personal use**, providing greater flexibility in how they access their music.

### <a id="_ndgyyqb4wp9q"></a>**6. Monthly Wrap**

VYNL provides a personalized **Monthly Wrap** that summarizes the user's listening activity and music preferences over the course of a month.

The wrap can analyze information such as:

- Total listening activity
- Most-played songs
- Most-listened-to artists
- Favorite genres
- Listening patterns
- Frequently replayed songs
- Skipped songs
- New artists discovered
- Other relevant listening statistics

# <a id="_43ih2gwhzo9y"></a>STORAGE AND STREAMING PIPELINE:

The Storage & Streaming Pipeline is responsible for efficiently acquiring, storing, managing, and delivering songs to users while avoiding unnecessary repeated API calls. When a user searches for a song, the system first checks the database to determine whether the requested song has already been stored. If the song is already present in the database, the system retrieves the corresponding Telegram File ID and uses it to generate a temporary playable or downloadable link, allowing the song to be streamed directly without contacting the external song API again. If the requested song is not available in the database, the system sends the song name to an open-source Song API. The API takes the song name as input and returns the requested song as an .mp4 file. This file is then uploaded to a private Telegram channel, which is used as the system's persistent audio storage. Once the file is uploaded, Telegram provides a unique File ID for that particular audio file. This File ID acts as a reference to the stored song and is saved in the application's database along with the song's other information. Therefore, instead of storing multiple copies of the audio file on the application's server or repeatedly downloading the same song from the external API, the system stores the audio once in Telegram and maintains its File ID in the database for future use.

After the audio has been acquired, the system performs metadata and audio-feature enrichment. The requested song is first searched in the local dataset to obtain its available attributes. These attributes include song\_name, artist\_name, artist\_genres, artist\_popularity, release\_year, danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness, liveness, and popularity. These attributes provide information about the song, artist, release, and the musical characteristics of the audio. If the requested song is available in the local dataset, the corresponding attributes are retrieved from the dataset. However, if the song is not present in the local dataset, the system uses ReccoBeats/FreqBlog as a fallback source to obtain the required audio features and metadata. This ensures that the absence of a particular song from the local dataset does not prevent the system from obtaining the information required for playback, analysis, or recommendation-related functionality.

In addition to the audio features, the system retrieves release-related metadata from Discogs. This metadata provides additional information about the song, artist, album, and release. The retrieved Discogs metadata is displayed to the user when the song is being played and is also stored in the database so that it can be reused in future requests. The database therefore acts as the central source for maintaining the relationship between the song, its metadata, audio features, and its corresponding Telegram File ID.

The Telegram File ID is a key component of the playback mechanism. Every song uploaded to the private Telegram channel receives a unique File ID. This ID is stored in the database and is used whenever the same song is requested again. When a user requests a song that already exists in the database, the system retrieves its stored File ID instead of calling the open-source Song API again. The File ID is then used to generate a dynamic temporary link that can be used to play or download the audio. This temporary link allows the application to provide access to the stored audio without exposing or requiring the original external API request. Since the link is generated dynamically when the song is requested, the system can continue using the same permanently stored Telegram file for multiple playback requests.

Overall, the pipeline follows a **fetch-once-and-reuse** approach. A song is fetched from the external API only when it is not already available in the system. Once fetched, the audio file is permanently stored in the private Telegram channel, while its unique File ID, metadata, and audio features are stored in the database. For subsequent requests, the system retrieves the existing File ID from the database and generates a temporary streaming or download link instead of making another API call. This architecture reduces redundant API requests, minimizes unnecessary bandwidth and processing, improves the response time for previously requested songs, and provides a centralized mechanism for managing both audio files and their associated metadata. Thus, the complete flow can be summarized as: **user requests a song → database checks for its existence → if missing, fetch the song from the open-source API → store the audio in the Telegram private channel → obtain and save its unique File ID → retrieve and store metadata and audio features → generate a temporary playback link using the File ID → stream the song to the user.**

# <a id="_2hjzyzz35rb"></a>RECOMMENDATION AND LEARNING PIPELINE


The Recommendation and Personalization Pipeline begins when a user logs into the website and searches for a song. After authentication, the user can search for and play any available song. The requested song is processed through the existing **Storage and Streaming Pipeline**, which handles song acquisition, Telegram-based storage, metadata retrieval, File ID management, and generation of the temporary streaming link. This ensures that the requested song is delivered to the user efficiently while avoiding unnecessary repeated API calls for songs that have already been stored.

While the user is listening to the selected song, the backend communicates with the **Machine Learning recommendation model** to generate the next set of songs that are likely to match the user's interests. The recommendation model considers information such as the user's previous listening history, songs that the user has played or skipped, interaction patterns, and the audio characteristics and metadata of previously consumed songs. Based on this information, the model produces a personalized list of recommended songs for that particular user.

The recommended songs are then added to the user's **personal queue**. Each recommendation is accompanied by a short explanation explaining why the song was selected. This explanation is generated by an **LLM (Large Language Model)** and is personalized according to both the user's listening history and the attributes of the recommended song. For example, instead of simply displaying *"Recommended for you"*, the system could generate a response such as *"You have been listening to energetic synth-pop tracks recently, so we picked this song because it has a similar tempo and high-energy sound while introducing a different artist."* This provides transparency and makes the recommendation feel more curated and personalized to the user.

The LLM-generated explanation is therefore based on two major sources of information: the **user's listening behavior** and the **characteristics of the recommended song**. The listening history provides information about what the user tends to enjoy, while the song attributes provide information about why the recommended song is similar or potentially interesting. This allows the system to generate a meaningful explanation rather than providing a generic recommendation message.

At the same time, the system continuously records the user's activities on the website. User interactions such as songs searched for, songs played, songs skipped, listening duration, songs added to or removed from the queue, likes, and interactions with recommendations are logged and stored as user activity data. These activities are collected throughout the day and serve as feedback for the recommendation system.

The collected user activity data is used to train the **Machine Learning recommendation model once every day**. At the end of each daily training cycle, the model is trained using the accumulated activity data from users. This allows the recommendation system to learn from the latest listening patterns, preferences, and interactions observed on the platform.

After the daily training process is completed, the updated model is used for subsequent recommendation requests. As users continue interacting with the platform, their new activities are again logged and accumulated for the next daily training cycle. This creates a continuous learning loop in which the recommendation model is regularly updated based on the latest available user behavior. The system therefore does not retrain the model after every individual interaction; instead, all user activities are continuously logged throughout the day and the accumulated data is used for the scheduled daily training process.

The same user activity and listening history can also provide richer context for the LLM when generating recommendation explanations. As more information about a user's listening patterns becomes available, the LLM can use this context to provide more relevant reasoning for why a particular song was selected. Therefore, personalization occurs at two levels: **the ML model improves the selection of songs**, while the **LLM uses user-specific context and song attributes to improve the explanation and reasoning behind those selections**.

The complete process can therefore be viewed as a continuous daily learning cycle:

**User Login → Song Search → Song Playback → Storage & Streaming Pipeline → ML Recommendation Model → Personalized Songs → User Queue → LLM-Generated Recommendation Reasoning → User Interaction → Activity Logging → Accumulated Activity Data → Daily Model Training → Updated Recommendation Model → Better Recommendations and Better Reasoning.**

The key idea behind this architecture is that the system does not treat recommendation as a one-time operation. Instead, user interactions are continuously collected throughout the day and contribute to the next scheduled model-training cycle. After the daily training process, the updated recommendation model can provide increasingly relevant recommendations based on the latest available user behavior, while the user's accumulated history provides richer context for generating personalized recommendation explanations.
