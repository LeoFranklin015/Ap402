import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

// Define website styles and their characteristics
interface StyleCharacteristics {
  color_scheme: string;
  typography: string;
  layout: string;
}

interface WebsiteStyles {
  [key: string]: StyleCharacteristics;
}

const WEBSITE_STYLES: WebsiteStyles = {
  professional: {
    color_scheme: "neutral, corporate colors",
    typography: "clean, sans-serif fonts",
    layout: "structured, grid-based",
  },
  creative: {
    color_scheme: "vibrant, bold colors",
    typography: "mix of modern and artistic fonts",
    layout: "dynamic, asymmetrical",
  },
  minimal: {
    color_scheme: "monochrome, subtle colors",
    typography: "simple, elegant fonts",
    layout: "clean, whitespace-focused",
  },
  "eco-friendly": {
    color_scheme: "earth tones, natural colors",
    typography: "organic, natural fonts",
    layout: "flowing, nature-inspired",
  },
};

// Interface definitions
interface WebsiteContent {
  title: string;
  meta: {
    description: string;
    keywords: string[];
    author: string;
  };
  hero: {
    heading: string;
    subheading: string;
    description: string;
    cta_button: string;
  };
  sections: Array<{
    title: string;
    content: string;
    layout: string;
  }>;
  cta: {
    heading: string;
    description: string;
    button_text: string;
    button_link: string;
  };
  style: {
    colors: string[];
    fonts: string[];
    layout_preferences: string[];
  };
}

// Utility functions
async function createHTMLFile(
  content: string,
  filename: string
): Promise<string> {
  try {
    await fs.writeFile(filename, content, "utf-8");
    return `Successfully created ${filename}`;
  } catch (error) {
    return `Error creating ${filename}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

async function createCSSFile(
  content: string,
  filename: string
): Promise<string> {
  try {
    await fs.writeFile(filename, content, "utf-8");
    return `Successfully created ${filename}`;
  } catch (error) {
    return `Error creating ${filename}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

async function createDirectory(dirPath: string): Promise<string> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return `Successfully created directory ${dirPath}`;
  } catch (error) {
    return `Error creating directory ${dirPath}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

// Tools classes (TypeScript equivalents of Python BaseTool)
class CreateHTMLFileTool {
  name = "create_html_file";
  description = "Create an HTML file with the given content.";

  async run(content: string, filename: string): Promise<string> {
    return await createHTMLFile(content, filename);
  }
}

class CreateCSSFileTool {
  name = "create_css_file";
  description = "Create a CSS file with the given content.";

  async run(content: string, filename: string): Promise<string> {
    return await createCSSFile(content, filename);
  }
}

class CreateDirectoryTool {
  name = "create_directory";
  description = "Create a directory if it doesn't exist.";

  async run(dirPath: string): Promise<string> {
    return await createDirectory(dirPath);
  }
}

// Main WebsiteBuilder class
export class WebsiteBuilder {
  private openaiClient: OpenAI;
  private htmlTool: CreateHTMLFileTool;
  private cssTool: CreateCSSFileTool;
  private directoryTool: CreateDirectoryTool;

  constructor(verbose: boolean = true) {
    // Initialize OpenAI
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize tools
    this.htmlTool = new CreateHTMLFileTool();
    this.cssTool = new CreateCSSFileTool();
    this.directoryTool = new CreateDirectoryTool();
  }

  /**
   * Clean the content by removing unnecessary newlines and whitespace.
   */
  private cleanContent(content: string): string {
    // Remove multiple consecutive newlines
    const lines = content.split("\n").filter((line) => line.trim());
    // Remove extra spaces
    return lines.join(" ").replace(/\s+/g, " ").trim();
  }

  /**
   * Generate website content using OpenAI based on the topic and style.
   */
  async generateWebsiteContent(
    topic: string,
    style: string = "professional"
  ): Promise<WebsiteContent> {
    console.log(
      `Generating website content for topic: ${topic} with style: ${style}`
    );

    // Get style characteristics
    const styleCharacteristics =
      WEBSITE_STYLES[style] || WEBSITE_STYLES["professional"];

    const prompt = `
Create a clean, modern website content structure for a ${style} website about ${topic}.
Keep all content concise and without unnecessary newlines or spaces.

Style Characteristics:
- Color Scheme: ${styleCharacteristics.color_scheme}
- Typography: ${styleCharacteristics.typography}
- Layout: ${styleCharacteristics.layout}

Include:
1. A compelling title and meta information
2. A hero section with main message
3. 3-4 main sections with relevant content
4. A call-to-action section

IMPORTANT: 
- Your response must be a valid JSON object with no additional text or explanation
- Keep all text content concise and without unnecessary newlines
- Use short, impactful sentences
- Avoid redundant information
- Always have the colors bright and vibrant. Understand the style and the colors and use them accordingly.
- Make the website look like a legit and professional and pro website.
- Ensure each section is visually distinct with good contrast between background and text.
- Use accent colors for headings, buttons, and links.
- Use card-like sections with subtle shadows and rounded corners.
- Add hover effects to buttons and links for interactivity.
- Ensure all text is readable and accessible (sufficient contrast, font size, spacing).
- Use modern CSS layout techniques (Flexbox, Grid) for responsive design.
- Add visual hierarchy: bolder section titles, clear separation between sections, and good use of whitespace.

Use this exact structure:
{
    "title": "Website Title",
    "meta": {
        "description": "Short, concise meta description",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "author": "Website Author"
    },
    "hero": {
        "heading": "Main Heading",
        "subheading": "Short Subheading",
        "description": "Brief, impactful description",
        "cta_button": "Action Text"
    },
    "sections": [
        {
            "title": "Section Title",
            "content": "Concise section content",
            "layout": "left"
        }
    ],
    "cta": {
        "heading": "Short CTA Heading",
        "description": "Brief CTA description",
        "button_text": "Button Text",
        "button_link": "Action URL"
    },
    "style": {
        "colors": ["primary", "secondary", "accent"],
        "fonts": ["heading", "body"],
        "layout_preferences": ["responsive", "modern"]
    }
}
`;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional website content creator. Create concise, impactful content without unnecessary newlines or spaces.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      // Get the response content and ensure it's valid JSON
      const contentStr = response.choices[0]?.message?.content?.trim();
      if (!contentStr) {
        throw new Error("Empty response from OpenAI");
      }

      console.log(`Raw response: ${contentStr}`);

      try {
        const content = JSON.parse(contentStr) as WebsiteContent;

        // Clean all text content
        for (const section of content.sections || []) {
          section.content = this.cleanContent(section.content);
        }
        content.hero.description = this.cleanContent(content.hero.description);
        content.cta.description = this.cleanContent(content.cta.description);
        content.meta.description = this.cleanContent(content.meta.description);

        console.log("Successfully parsed and cleaned JSON response");
        return content;
      } catch (parseError) {
        console.log(
          `Failed to parse JSON response: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`
        );

        // Fallback to a default structure if JSON parsing fails
        return {
          title: `${topic} Website`,
          meta: {
            description: `A ${style} website about ${topic}`,
            keywords: [topic, style, "website"],
            author: "Website Builder",
          },
          hero: {
            heading: `Welcome to ${topic}`,
            subheading: `Your ${style} destination for ${topic}`,
            description: `Discover everything about ${topic}`,
            cta_button: "Learn More",
          },
          sections: [
            {
              title: "About",
              content: `Learn more about ${topic}`,
              layout: "left",
            },
          ],
          cta: {
            heading: "Get Started",
            description: "Join us today",
            button_text: "Contact Us",
            button_link: "#contact",
          },
          style: {
            colors: ["#000000", "#ffffff", "#cccccc"],
            fonts: ["Arial", "Helvetica"],
            layout_preferences: ["responsive", "modern"],
          },
        };
      }
    } catch (error) {
      console.log(
        `Error generating website content: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Determine the most appropriate style based on the topic and description.
   */
  private determineStyle(topic: string, description: string): string {
    // Keywords for each style
    const styleKeywords = {
      professional: [
        "business",
        "corporate",
        "professional",
        "enterprise",
        "company",
        "services",
        "consulting",
        "finance",
        "legal",
        "medical",
      ],
      creative: [
        "art",
        "design",
        "creative",
        "portfolio",
        "photography",
        "music",
        "fashion",
        "entertainment",
        "media",
        "digital",
      ],
      minimal: [
        "tech",
        "startup",
        "product",
        "app",
        "software",
        "digital",
        "modern",
        "clean",
        "simple",
        "minimalist",
        "hackathon",
      ],
      "eco-friendly": [
        "sustainable",
        "eco",
        "green",
        "environment",
        "nature",
        "organic",
        "renewable",
        "conservation",
        "sustainability",
        "eco-friendly",
        "hackathon",
      ],
    };

    // Combine topic and description for analysis
    const text = `${topic} ${description}`.toLowerCase();

    // Count keyword matches for each style
    const styleScores: { [key: string]: number } = {};
    for (const [style, keywords] of Object.entries(styleKeywords)) {
      const score = keywords.reduce((count, keyword) => {
        return text.includes(keyword) ? count + 1 : count;
      }, 0);
      styleScores[style] = score;
    }

    // Get the style with the highest score
    const entries = Object.entries(styleScores);
    if (entries.length > 0) {
      const maxEntry = entries.reduce((max, current) =>
        current[1] > max[1] ? current : max
      );
      return maxEntry[0];
    }

    // Default to professional if no clear match
    return "professional";
  }

  /**
   * Generate HTML content based on the website data
   */
  private generateHTML(content: WebsiteContent): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${content.meta.description}">
    <meta name="keywords" content="${content.meta.keywords.join(", ")}">
    <meta name="author" content="${content.meta.author}">
    <title>${content.title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="hero">
        <div class="container">
            <h1 class="hero-heading">${content.hero.heading}</h1>
            <h2 class="hero-subheading">${content.hero.subheading}</h2>
            <p class="hero-description">${content.hero.description}</p>
            <button class="cta-button primary">${
              content.hero.cta_button
            }</button>
        </div>
    </header>

    <main>
        ${content.sections
          .map(
            (section, index) => `
        <section class="content-section ${index % 2 === 0 ? "even" : "odd"}">
            <div class="container">
                <div class="section-card">
                    <h2 class="section-title">${section.title}</h2>
                    <p class="section-content">${section.content}</p>
                </div>
            </div>
        </section>
        `
          )
          .join("")}
    </main>

    <footer class="cta-section">
        <div class="container">
            <div class="cta-card">
                <h2 class="cta-heading">${content.cta.heading}</h2>
                <p class="cta-description">${content.cta.description}</p>
                <a href="${
                  content.cta.button_link
                }" class="cta-button secondary">${content.cta.button_text}</a>
            </div>
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Generate CSS content based on the website data
   */
  private generateCSS(): string {
    return `/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 100px 0;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
}

.hero .container {
    position: relative;
    z-index: 1;
}

.hero-heading {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-subheading {
    font-size: 1.5rem;
    font-weight: 300;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.hero-description {
    font-size: 1.2rem;
    margin-bottom: 3rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    opacity: 0.9;
}

/* Buttons */
.cta-button {
    display: inline-block;
    padding: 15px 30px;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: 50px;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.cta-button.primary {
    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
    color: white;
}

.cta-button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.cta-button.secondary {
    background: linear-gradient(45deg, #4834d4, #686de0);
    color: white;
}

.cta-button.secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(72, 52, 212, 0.4);
}

/* Content Sections */
.content-section {
    padding: 80px 0;
    position: relative;
}

.content-section.even {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
}

.content-section.odd {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
}

.section-card {
    background: rgba(255, 255, 255, 0.1);
    padding: 40px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    text-align: center;
    transition: transform 0.3s ease;
}

.section-card:hover {
    transform: translateY(-5px);
}

.section-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 2rem;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.section-content {
    font-size: 1.1rem;
    line-height: 1.8;
    max-width: 800px;
    margin: 0 auto;
}

/* CTA Section */
.cta-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 80px 0;
    text-align: center;
}

.cta-card {
    background: rgba(255, 255, 255, 0.1);
    padding: 50px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    color: white;
}

.cta-heading {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.cta-description {
    font-size: 1.2rem;
    margin-bottom: 2.5rem;
    opacity: 0.9;
}

/* Responsive Design */
@media (max-width: 768px) {
    .hero-heading {
        font-size: 2.5rem;
    }
    
    .hero-subheading {
        font-size: 1.2rem;
    }
    
    .hero-description {
        font-size: 1rem;
    }
    
    .section-title {
        font-size: 2rem;
    }
    
    .cta-heading {
        font-size: 2rem;
    }
    
    .section-card,
    .cta-card {
        padding: 30px 20px;
    }
    
    .content-section {
        padding: 50px 0;
    }
}

@media (max-width: 480px) {
    .hero {
        padding: 60px 0;
    }
    
    .hero-heading {
        font-size: 2rem;
    }
    
    .cta-button {
        padding: 12px 24px;
        font-size: 1rem;
    }
}

/* Animation */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.section-card,
.cta-card {
    animation: fadeInUp 0.6s ease-out;
}`;
  }

  /**
   * Build a complete website based on the provided input data
   */
  async buildWebsite(
    inputData: string,
    outputDir: string = "website"
  ): Promise<string> {
    console.info(`Starting website build with input: ${inputData}`);

    // Use the input data as both topic and description
    const topic = inputData;
    const description = inputData;

    // Determine the appropriate style based on the input data
    const style = this.determineStyle(topic, description);
    console.info(`Determined style: ${style}`);

    // Generate content using OpenAI
    const content = await this.generateWebsiteContent(topic, style);

    // Create output directory
    await this.directoryTool.run(outputDir);

    // Generate HTML and CSS content
    const htmlContent = this.generateHTML(content);
    const cssContent = this.generateCSS();

    // Create HTML file
    const htmlPath = path.join(outputDir, "index.html");
    await this.htmlTool.run(htmlContent, htmlPath);

    // Create CSS file
    const cssPath = path.join(outputDir, "styles.css");
    await this.cssTool.run(cssContent, cssPath);

    console.info("Website build completed");
    return `Website successfully built in ${outputDir} directory with index.html and styles.css`;
  }
}

// Example usage
if (require.main === module) {
  async function main() {
    try {
      const builder = new WebsiteBuilder();
      const result = await builder.buildWebsite(
        "Hackathon website for a hackathon hosted by Nevermined , with a prize pool of 10k , we need a registration buttton , explaining the stuffs"
      );
      console.log(result);
    } catch (error) {
      console.error("Error building website:", error);
    }
  }

  main();
}
