import test from 'node:test';import assert from 'node:assert/strict';import{reviewedRetrievalRevision}from'../scripts/ingest/apply.mjs';
test('a later original at the same URL requires exact prior registration pins',()=>{
 const old={SourceID:'OLD',SHA256:'a'.repeat(64),URL:'https://maker.test/product','Access date':'2026-09-20'};
 const p={source:{row:{SourceID:'NEW',SHA256:'b'.repeat(64),URL:old.URL,'Access date':'2026-09-28'}},review:{retrievalRevision:{previousSourceID:'OLD',previousSHA256:old.SHA256,accessed:'2026-09-28',by:'test reviewer'}}};
 assert.equal(reviewedRetrievalRevision(p,[old]),true);
 for(const mutation of [q=>q.review.retrievalRevision.previousSHA256='c'.repeat(64),q=>q.source.row.SHA256=old.SHA256,q=>q.source.row.SourceID='OLD',q=>q.source.row.URL+='other',q=>q.review.retrievalRevision.accessed='2026-09-20',q=>delete q.review.retrievalRevision.by]){let q=structuredClone(p);mutation(q);assert.equal(reviewedRetrievalRevision(q,[old]),false);}
 const metadata={...old,SHA256:'Not recorded','Citation role':'corroboration'},q=structuredClone(p);
 q.review.retrievalRevision.previousSHA256='Not recorded';
 assert.equal(reviewedRetrievalRevision(q,[metadata]),false);
 q.review.retrievalRevision.previousDigestNotRecorded='Earlier entry retained metadata only; this original is a new retrieval.';
 assert.equal(reviewedRetrievalRevision(q,[metadata]),true);
 assert.equal(reviewedRetrievalRevision(q,[{...metadata,'Citation role':'cited'}]),false);
});
