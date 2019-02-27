import optparse
from elasticsearch_dsl import connections
from elasticsearch import Elasticsearch
from indexer.parser import HTMLparser
from indexer.post import Post
import glob
import os
import json

parser = optparse.OptionParser()

parser.add_option('-i', '--input', dest="input", help="Input path", default='data')

options, args = parser.parse_args()
#options.input -> to access the data folder

client = Elasticsearch()

def read_links(filepath):
    jsonfile = {}
    with open(filepath) as f:
        jsonfile = json.load(f)
    out = {}
    for k,v in jsonfile.items():
        out[v['filename']] = v
        out[v['filename']]['url'] = k
        del out[v['filename']]['filename']
    return out 

connections.create_connection(hosts=['localhost'], port=9200)
Post.init()

# for loop through htmls file, calling the parser and elasticsearch
path = os.path.join(options.input, '*') + os.path.sep
folders = glob.glob(path)
saved_documents = 0
itered_documents = 0
for folder in folders:
    linkspath =  os.path.join(folder, 'links.json')
    path = os.path.join(folder, 'pages', '*')
    filepaths = glob.glob(path)
    files_info = read_links(linkspath)
    for filepath in filepaths:
        with open(filepath, 'r', encoding="utf-8") as f:
            filename = filepath.split(os.path.sep)[-1]
            blogName = filename.split('_')[0]
            url = files_info[filename]['url']
            if len(url) <= 512 and not client.exists(index='blog', doc_type='doc', id=url):
                post = HTMLparser(f.read(), blogName, url)
                if post is not None:
                    post.save()
                    saved_documents+=1
            itered_documents += 1
            print('Saved documents {} out of {}'.format(saved_documents, itered_documents), end='\r')
