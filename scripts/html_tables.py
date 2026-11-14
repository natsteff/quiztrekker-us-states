from html.parser import HTMLParser
import re
class Tables(HTMLParser):
    def __init__(self):
        super().__init__();self.tables=[];self.depth=0;self.row=None;self.cell=None;self.skip=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='table':
            self.depth+=1
            if self.depth==1:self.tables.append([])
        if self.depth!=1:return
        if tag=='tr':self.row=[]
        if tag in ('td','th'):self.cell=[]
        if tag in ('sup','style','script'):self.skip+=1
        if tag=='br' and self.cell is not None:self.cell.append(' | ')
    def handle_endtag(self,tag):
        if self.depth==1:
            if tag in ('sup','style','script'):self.skip=max(0,self.skip-1)
            if tag in ('td','th') and self.cell is not None:
                if self.row is not None:self.row.append(re.sub(r'\s+',' ',''.join(self.cell)).strip())
                self.cell=None
            if tag=='tr' and self.row is not None:
                self.tables[-1].append(self.row);self.row=None
        if tag=='table':self.depth-=1
    def handle_data(self,data):
        if self.cell is not None and not self.skip:self.cell.append(data)
def tables(text):
    p=Tables();p.feed(text);return p.tables
