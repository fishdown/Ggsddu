/*
#!name = 天撸啦 porn
#!desc = Adfree
#!openUrl = https://tianlula.com
#!homepage = https://t.me/Tianlulatv
#!icon = https://raw.githubusercontent.com/fishdown/Icon/refs/heads/master/app/tianll.png
#!tag=18+
#!author = fishdown

[Rewrite]
request if ${url} ~= /^https?:\/\/[^\/\s]+\.top(?::\d+)?\/res\?s=Api-(?:site_conf|ads_list)(?:&.*)?$/i then reject_dict(200)

[MitM]
hostname = *.top
*/

/*
^https?:\/\/[^\/\s]+\.top(?::\d+)?\/res\?s=Api-(?:site_conf|ads_list)(?:&.*)?$ url reject-dict
hostname = *.top
*/
