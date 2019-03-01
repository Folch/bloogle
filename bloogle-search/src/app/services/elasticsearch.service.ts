import { Injectable } from '@angular/core';
import { Client } from 'elasticsearch-browser';
import { Post } from '../model/post';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { from } from 'rxjs';
import { ElasticSearchResult, ElasticSearchRequest, ElasticDateRange } from '../model/elastic-search';

@Injectable({
  providedIn: 'root'
})
export class ElasticsearchService {
  public readonly DEFAULT_NUM_PAGES = 10;
  private client: Client;
  private readonly _index = 'blog';
  private readonly _type = 'doc';

  private query(q: string, fullquery: string,
    num: number, fromNum: number, gte?: ElasticDateRange, matchPhrases?: string[], mustNotPhrases?: string[]) {
    const query: ElasticSearchRequest = {
      'query': {
        'bool': {}
      },
      'highlight': {
        'pre_tags': [
          '<strong>'],
        'post_tags': [
          '</strong>'],
        'fields': {
          'content': {},
          'title': {}
        }
      },
      'from': fromNum,
      'size': num,
      'suggest': {
        'mytermsuggester': {
          'text': fullquery,
          'term': {
            'field': 'rawContent',
          },
        }
      }
    };
    if (q) {
      query.query.bool.must = [];
      query.query.bool.must.push({
        'multi_match': {
          'query': q,
          'fields': [
            'content',
            'publishDate',
            'publishModified',
            'author'
          ]
        }
      });
    }
    if (gte) {
      if (!query.query.bool.must) {
        query.query.bool.must = [];
      }
      query.query.bool.must.push({
        'range': {
          'datePublished': {
            'gte': gte
          }
        }
      });
    }
    if (matchPhrases && matchPhrases.length) {
      query.query.bool.should = [];
      for (const match of matchPhrases) {
        query.query.bool.should.push({
          'match_phrase': {
            'content': match
          }
        });
        query.query.bool.should.push({
          'match_phrase': {
            'title': match
          }
        });
      }
    }
    if (mustNotPhrases && mustNotPhrases.length) {
      query.query.bool.must_not = [];
      for (const match of mustNotPhrases) {
        query.query.bool.must_not.push({
          'match_phrase': {
            'content': match
          }
        });
        query.query.bool.must_not.push({
          'match_phrase': {
            'title': match
          }
        });
      }
    }

    return query;
  }

  constructor() {
    this.client = new Client({
      host: 'http://localhost:9200',
      log: 'trace',
    });
  }



  search(query, fullquery, page = 0, gte?: ElasticDateRange, matchPhrases?: string[], mustNotPhrases?: string[]): Observable<QueryResult> {
    const p: Promise<any> = this.client.search({
      index: this._index,
      type: this._type,
      body: this.query(query, fullquery, this.DEFAULT_NUM_PAGES, page * this.DEFAULT_NUM_PAGES, gte, matchPhrases, mustNotPhrases),
    });
    return from(p).pipe(map(this.mapES));
  }
  searchOne(query): Observable<QueryResult> {
    const p: Promise<ElasticSearchResult> = this.client.search({
      index: this._index,
      type: this._type,
      body: this.query(query, query, 1, 0),
    });
    return from(p).pipe(map(this.mapES));
  }

  private mapES(r: ElasticSearchResult): QueryResult {
    function getTermSuggester(r2: ElasticSearchResult, tags: boolean) {
      return r2.suggest.mytermsuggester.map(suggester => {
        if (tags) {
          return suggester.options.length ? '<strong><em>' + suggester.options[0].text + '</em></strong>' : suggester.text;
        }
        return suggester.options.length ? suggester.options[0].text : suggester.text;

      }).join(' ').trim();
    }
    const queryResult = new QueryResult();
    queryResult.time = r.took;
    queryResult.numResults = r.hits.total;
    queryResult.posts = r.hits.hits.map(item => {
      const p: Post = Object.assign(new Post(), item._source);
      if (item.highlight) {
        if (item.highlight.content) {
          p.content = item.highlight.content.join('...').concat('...');
          p.contentHasHtml = true;
        }
        if (item.highlight.title) {
          if (item.highlight.title.length === 1) {
            p.title = item.highlight.title[0];
          } else {
            p.title = item.highlight.title.join('...').concat('...');
          }
        }
      }
      return p;
    });
    queryResult.suggestedHtml = getTermSuggester(r, true);
    queryResult.suggestedNonHtml = getTermSuggester(r, false);
    return queryResult;
  }
}

export class QueryResult {
  time: number;
  numResults: number;
  posts: Post[];
  suggestedHtml: string;
  suggestedNonHtml: string;
}
