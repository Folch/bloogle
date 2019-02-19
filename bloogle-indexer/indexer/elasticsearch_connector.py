from elasticsearch import Elasticsearch
import sys

INDEX = 'bloogle'
_TYPE = 'post'

class ElasticsearchConnector():

    def __init__(self):
        self.es = Elasticsearch([{'host': 'localhost', 'port': 9200}])
        if self.es.ping():
            print('Yay Connected')
        else:
            print('Awww it could not connect!')
            sys.exit()
        self.__configure__()
        
    def __configure__(self):
        settings = {
            "settings": {
                "analysis": {
                    "analyzer": {
                        "english_exact": {
                            "tokenizer": "standard",
                            "filter": [
                                "lowercase"
                            ]
                        }
                      }
                    }
            },
            "mappings": {
                _TYPE: {
                    "dynamic": "strict",
                    "properties": {
                        "title": {
                            "type": "text"
                        },
                        "content": {
                            "type": "text"
                        },
                        "url": {
                            "type": "text"
                        },
                        "blog": {
                            "type": "text"
                        }
                    }
                }
            }
        }

        if not self.es.indices.exists(INDEX):
            settings["number_of_shards"] = 1
            settings["number_of_replicas"] = 0
            self.es.indices.create(index=INDEX, body=settings)
            print('Index created')
        else:
            self.es.indices.close(index=INDEX)
            self.es.indices.put_settings(body=settings)
            self.es.indices.open(index=INDEX)
            print('Index updated')
        # Follow this post to configure: https://towardsdatascience.com/getting-started-with-elasticsearch-in-python-c3598e718380
        # ignore 400 cause by IndexAlreadyExistsException when creating an index
        # self.es.indices.create(index='bloogle', ignore = 400)
        
    
    def store(self, title, content, url, blog):

        body = {
            'title': title,
            'content': content,
            'url': url,
            'blog': blog
        }
        self.es.index(index=INDEX, doc_type=_TYPE, body=body)

    # Create methods to store data
    # Guidelines:
    #   * index: 'bloogle'
    #   * _type: post
    #   * id: don't especify, so it will be created automatically
    #   * Attributes to be stored:
    #       * title: Indexable
    #       * content: Indexable
    #       * URL: non-indexable
    #       * blog: indexable {medium, wired, etc...}