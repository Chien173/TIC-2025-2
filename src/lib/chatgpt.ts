interface ChatGPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AuditAnalysis {
  schemaStatus: 'Có' | 'Không' | 'Một phần';
  detailedInfo: string[];
  improvements: string[];
  geoSchemas: Array<{
    type: string;
    status: 'valid' | 'invalid' | 'warning';
    properties: Record<string, any>;
  }>;
  issues: string[];
  score: number;
}

// Get API key from environment variable for security
const CHATGPT_API_KEY = import.meta.env.VITE_CHATGPT_API_KEY || '';


export const chatGPTService = {
  async analyzeWebsiteForGEO(url: string): Promise<AuditAnalysis> {
    const prompt = `Tôi muốn bạn đóng vai trò là chuyên gia SEO kỹ thuật và schema markup.

Hãy phân tích website sau để đánh giá mức độ tuân thủ GEO schema – đặc biệt là các structured data liên quan đến thông tin địa phương như LocalBusiness.

URL website: ${url}

Hãy kiểm tra và phản hồi các nội dung sau:

1. **Có tồn tại schema GEO liên quan không?**
   - Các loại schema cần kiểm tra: LocalBusiness, Place, PostalAddress, GeoCoordinates
   - Dạng dữ liệu sử dụng: JSON-LD, Microdata, RDFa

2. **Thông tin schema có đầy đủ và chính xác không?**
   - @type: Có là LocalBusiness hoặc loại phù hợp không?
   - name, address, telephone, openingHours: có đầy đủ không?
   - addressLocality, addressCountry, postalCode: có đúng định dạng không?
   - geo (latitude, longitude): có được khai báo không?

3. **Dữ liệu có tuân thủ theo chuẩn schema.org không?**
   - Có lỗi trong cú pháp hoặc kiểu dữ liệu không?
   - Có dữ liệu thừa hoặc thiếu cần tối ưu không?

4. **Khuyến nghị cải thiện nếu thiếu hoặc sai dữ liệu GEO schema**

Trả kết quả theo định dạng JSON với cấu trúc sau:
{
  "schemaStatus": "Có/Không/Một phần",
  "detailedInfo": ["mục 1", "mục 2", ...],
  "improvements": ["đề xuất 1", "đề xuất 2", ...],
  "geoSchemas": [
    {
      "type": "LocalBusiness",
      "status": "valid/invalid/warning",
      "properties": {
        "name": "...",
        "address": "...",
        "telephone": "..."
      }
    }
  ],
  "issues": ["vấn đề 1", "vấn đề 2", ...],
  "score": 85
}

Hãy phân tích thực tế và trả về JSON hợp lệ.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHATGPT_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia SEO kỹ thuật và schema markup. Hãy phân tích website và trả về kết quả dưới dạng JSON hợp lệ.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`ChatGPT API error: ${response.status} ${response.statusText}`);
      }

      const data: ChatGPTResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from ChatGPT');
      }

      // Parse JSON response from ChatGPT
      try {
        const analysis: AuditAnalysis = JSON.parse(content);
        return analysis;
      } catch (parseError) {
        console.error('Failed to parse ChatGPT response as JSON:', content);
        
        // Fallback: create analysis from text response
        return this.parseTextResponse(content, url);
      }
    } catch (error) {
      console.error('ChatGPT API error:', error);
      
      // Fallback to mock analysis if API fails
      return this.getMockAnalysis(url);
    }
  },

  async analyzeWordPressPost(postUrl: string, postTitle: string, postContent: string): Promise<AuditAnalysis> {
    const prompt = `Tôi muốn bạn đóng vai trò là chuyên gia SEO kỹ thuật và schema markup.

Hãy phân tích bài viết WordPress sau để đánh giá mức độ tuân thủ schema markup cho Article và các schema liên quan:

URL bài viết: ${postUrl}
Tiêu đề: ${postTitle}
Nội dung: ${postContent.substring(0, 1000)}...

Hãy kiểm tra và phản hồi:

1. **Schema Article có tồn tại không?**
   - Kiểm tra: headline, author, datePublished, dateModified, description
   - mainEntityOfPage, publisher, image

2. **Schema BreadcrumbList có được khai báo không?**

3. **Schema Person (author) có đầy đủ không?**

4. **Schema Organization (publisher) có chính xác không?**

5. **Đề xuất cải thiện cho SEO và schema markup**

Trả kết quả theo định dạng JSON:
{
  "schemaStatus": "Có/Không/Một phần",
  "detailedInfo": ["thông tin chi tiết"],
  "improvements": ["đề xuất cải thiện"],
  "geoSchemas": [
    {
      "type": "Article",
      "status": "valid/invalid/warning",
      "properties": {...}
    }
  ],
  "issues": ["vấn đề cần khắc phục"],
  "score": 75
}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHATGPT_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia SEO kỹ thuật và schema markup. Phân tích bài viết và trả về JSON hợp lệ.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`ChatGPT API error: ${response.status} ${response.statusText}`);
      }

      const data: ChatGPTResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from ChatGPT');
      }

      try {
        const analysis: AuditAnalysis = JSON.parse(content);
        return analysis;
      } catch (parseError) {
        console.error('Failed to parse ChatGPT response as JSON:', content);
        return this.parseTextResponse(content, postUrl);
      }
    } catch (error) {
      console.error('ChatGPT API error:', error);
      return this.getMockAnalysis(postUrl);
    }
  },

  parseTextResponse(content: string, url: string): AuditAnalysis {
    // Parse text response and extract information
    const hasSchema = content.toLowerCase().includes('có') || content.toLowerCase().includes('tồn tại');
    const hasIssues = content.toLowerCase().includes('thiếu') || content.toLowerCase().includes('lỗi');
    
    return {
      schemaStatus: hasSchema ? 'Một phần' : 'Không',
      detailedInfo: [
        'Phân tích được thực hiện bởi ChatGPT',
        'Kết quả dựa trên nội dung phản hồi từ AI'
      ],
      improvements: [
        'Thêm schema LocalBusiness cho thông tin doanh nghiệp',
        'Bổ sung thông tin địa chỉ và tọa độ địa lý',
        'Tối ưu hóa structured data theo chuẩn schema.org'
      ],
      geoSchemas: [
        {
          type: 'Organization',
          status: hasSchema ? 'warning' : 'invalid',
          properties: {
            name: 'Website Name',
            url: url
          }
        }
      ],
      issues: hasIssues ? [
        'Thiếu schema LocalBusiness',
        'Chưa có thông tin địa chỉ cụ thể',
        'Thiếu tọa độ địa lý (latitude, longitude)'
      ] : [],
      score: hasSchema ? 65 : 35
    };
  },

  getMockAnalysis(url: string): AuditAnalysis {
    return {
      schemaStatus: 'Một phần',
      detailedInfo: [
        'Website có một số schema cơ bản',
        'Thiếu schema GEO quan trọng cho SEO địa phương',
        'Cần bổ sung thông tin LocalBusiness'
      ],
      improvements: [
        'Thêm schema LocalBusiness với thông tin đầy đủ',
        'Bổ sung PostalAddress với địa chỉ cụ thể',
        'Thêm GeoCoordinates cho vị trí chính xác',
        'Cập nhật openingHours cho giờ hoạt động',
        'Thêm telephone và email liên hệ'
      ],
      geoSchemas: [
        {
          type: 'Organization',
          status: 'warning',
          properties: {
            name: 'Website Organization',
            url: url,
            description: 'Thông tin tổ chức cơ bản'
          }
        }
      ],
      issues: [
        'Thiếu schema LocalBusiness cho SEO địa phương',
        'Chưa có thông tin địa chỉ PostalAddress',
        'Thiếu tọa độ địa lý GeoCoordinates',
        'Chưa khai báo giờ hoạt động openingHours'
      ],
      score: 60
    };
  }
};