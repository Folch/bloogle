import { Injectable } from '@angular/core';
import { Client } from 'elasticsearch-browser';
import { Post } from '../model/post';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { from } from 'rxjs';
import { ElasticSearchResult } from '../model/elastic-search';

@Injectable({
  providedIn: 'root'
})
export class ElasticsearchService {
  public readonly DEFAULT_NUM_PAGES = 10;
  private client: Client;
  private readonly _index = 'blog';
  private readonly _type = 'doc';
  // private queryAllPosts = {
  //   'query': {
  //     'match_all': {}
  //   }
  // };
  private query(q: string, num: number, fromNum: number) {
    return {
      'query': {
        'multi_match': {
          'query': q,
          'fields': ['content', 'publishDate', 'publishModified', 'author']
        }
      },
      'from': fromNum,
      'size': num
    };
  }

  constructor() {
    this.client = new Client({
      host: 'http://localhost:9200',
      log: 'trace',
    });
  }



  search(query, page = 0): Observable<QueryResult> {
    const p: Promise<any> = this.client.search({
      index: this._index,
      type: this._type,
      body: this.query(query, this.DEFAULT_NUM_PAGES, page * this.DEFAULT_NUM_PAGES),
    });
    return from(p).pipe(map(this.mapES));
  }
  searchOne(query): Observable<QueryResult> {
    const p: Promise<ElasticSearchResult> = this.client.search({
      index: this._index,
      type: this._type,
      body: this.query(query, 1, 0),
    });
    return from(p).pipe(map(this.mapES));
  }

  private mapES(r: ElasticSearchResult): QueryResult {
    const queryResult = new QueryResult();
    queryResult.time = r.took;
    queryResult.numResults = r.hits.total;
    queryResult.posts = r.hits.hits.map(item => item._source);
    return queryResult;
  }
}

export class QueryResult {
  time: number;
  numResults: number;
  posts: Post[];
}
