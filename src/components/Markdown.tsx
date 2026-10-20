import ReactMarkdown from 'react-markdown'
import rehypeHighlight, { type Options } from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

const highlight: Options = { detect: false, plainText: ['text'] }

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, highlight]]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
