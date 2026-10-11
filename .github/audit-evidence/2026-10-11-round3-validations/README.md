# Additional reader, character and shelf journey validation

Production source `4055dbf32044d69afa0679a932e22b240117143a`. No application code changes. Real local Spring/Mongo persistence; disposable fixture accounts/data only.

Character create/edit/delete completed. Before reader completion, private goals, private aliases, spoilers and gated lore were absent from reader API responses; public character background was available to a guest. Chapter completion unlocked the Story Bible reveal. Fresh reading progress: chapter 1 completion → Continue opens chapter 2 → both chapters persist as completed. Shelf creation/bulk-add/public visibility/private visibility were exercised, with a guest checking the resulting public profile.

The custom-shelf management finding is an enhancement: no rename/delete UI is exposed. Its screenshot records the expanded available actions. This is not a failed deletion request. `api.deleteShelf` exists but has no page/component caller.

Passing these scenarios does not establish exhaustive role, browser or timing coverage. Physical iPhone and real third-party services remain unverified. Selected screenshot/measurement files contain no credentials or customer data.
