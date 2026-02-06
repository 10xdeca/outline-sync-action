/**
 * Outline API client with retry logic and rate limit handling
 */
export class OutlineClient {
  constructor(apiKey, baseUrl = 'https://app.getoutline.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  /**
   * Make an API request with retry/backoff for rate limits
   */
  async request(endpoint, body = {}) {
    const url = `${this.baseUrl}/api/${endpoint}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          if (attempt === this.maxRetries) {
            throw new Error(`Rate limited after ${this.maxRetries} retries`);
          }
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (error.message.includes('Rate limited') || error.message.includes('API error')) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw new Error(`Network error after ${this.maxRetries} retries: ${error.message}`);
        }

        const delay = this.baseDelay * Math.pow(2, attempt);
        console.log(`Network error, retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * List all documents in a collection (handles pagination)
   */
  async listDocuments(collectionId) {
    const documents = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.request('documents.list', {
        collectionId,
        limit,
        offset,
      });

      if (!response.data || response.data.length === 0) {
        break;
      }

      documents.push(...response.data);

      if (response.data.length < limit) {
        break;
      }

      offset += limit;
    }

    return documents;
  }

  /**
   * Search for documents by title in a collection
   */
  async searchTitles(query, collectionId) {
    const response = await this.request('documents.search_titles', {
      query,
      collectionId,
    });
    return response.data || [];
  }

  /**
   * Find a document by exact title match
   */
  async findByTitle(title, collectionId) {
    const results = await this.searchTitles(title, collectionId);
    return results.find(doc => doc.title === title) || null;
  }

  /**
   * Create a new document
   */
  async createDocument(title, text, collectionId) {
    const response = await this.request('documents.create', {
      title,
      text,
      collectionId,
      publish: true,
    });
    return response.data;
  }

  /**
   * Update an existing document
   */
  async updateDocument(id, title, text) {
    const response = await this.request('documents.update', {
      id,
      title,
      text,
    });
    return response.data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id) {
    await this.request('documents.delete', {
      id,
    });
  }
}
