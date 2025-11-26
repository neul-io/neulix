import Page from '../components/page';

export default function Docs() {
  return (
    <Page>
      <h1>Documentation</h1>
      <p>
        This page is <strong>NOT hydrated</strong>. It&apos;s pure SSR HTML with no client-side JavaScript.
      </p>
      Very little styles, almost nothing.
    </Page>
  );
}
