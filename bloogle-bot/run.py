import scrapy
from scrapy.crawler import CrawlerProcess
from blooglebot.spiders.wired_spider import WiredSpider
from blooglebot.spiders.medium_spider import MediumSpider
from blooglebot.spiders.steemit_spider import SteemitSpider
from blooglebot.spiders.gizmodo_spider import GizmodoSpider
from blooglebot.spiders.theverge_spider import TheVergeSpider
from blooglebot.spiders.techcrunch_spider import TechCrunchSpider
import optparse

parser = optparse.OptionParser()

parser.add_option('-o', '--output',
    action="store", dest="output",
    help="output path", default="data")

options, args = parser.parse_args()

process = CrawlerProcess()
process.crawl(WiredSpider, options.output)
process.crawl(MediumSpider, options.output)
process.crawl(SteemitSpider, options.output)
process.crawl(GizmodoSpider, options.output)
process.crawl(TheVergeSpider, options.output)
process.crawl(TechCrunchSpider, options.output)
process.start() # the script will block here until all crawling jobs are finished