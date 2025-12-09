// vulnerable: dangerouslySetInnerHTML

//fix based on code given in slides
import DOMPurify from 'dompurify';

function Comment({ html }) {
  const cleanInput = DOMPurify.sanitize(html)
  return <div dangerouslySetInnerHTML={{ __html: cleanInput }} />;
}
