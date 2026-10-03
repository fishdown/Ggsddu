/*
#!name = Tianlula.TV porn
#!desc = 去广告
#!openUrl = https://tianlula.tv
#!homepage = https://t.me/Tianlulatv
#!icon = https://raw.githubusercontent.com/fishdown/Icon/refs/heads/master/app/tll.png
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
